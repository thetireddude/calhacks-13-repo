import type { FastifyInstance } from "fastify";
import type { PutProposalVoteRequest, VoteChoice } from "@gather/contracts";
import { requireAuth } from "../auth.js";
import type { GroupsStore } from "../groups/store.js";
import type { PlanningStore } from "../planning/store.js";
import type { VotingStore } from "./store.js";

const VOTE_CHOICES: VoteChoice[] = ["approve", "cant_make_it"];

function isVoteChoice(value: unknown): value is VoteChoice {
  return typeof value === "string" && VOTE_CHOICES.includes(value as VoteChoice);
}

function toIcsUtc(iso: string): string {
  const date = new Date(iso);
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  const h = String(date.getUTCHours()).padStart(2, "0");
  const min = String(date.getUTCMinutes()).padStart(2, "0");
  const s = String(date.getUTCSeconds()).padStart(2, "0");
  return `${y}${m}${d}T${h}${min}${s}Z`;
}

function escapeIcsText(value: string): string {
  return value
    .replaceAll("\\", "\\\\")
    .replaceAll("\n", "\\n")
    .replaceAll(";", "\\;")
    .replaceAll(",", "\\,");
}

function confirmedEventToIcs(event: {
  id: string;
  summary: string;
  confirmedAt: string;
}): string {
  const start = new Date(event.confirmedAt);
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  const dtstamp = toIcsUtc(event.confirmedAt);
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Gather//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${event.id}`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART:${dtstamp}`,
    `DTEND:${toIcsUtc(end.toISOString())}`,
    `SUMMARY:${escapeIcsText(event.summary)}`,
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}

export function registerVotingRoutes(
  app: FastifyInstance,
  groupsStore: GroupsStore,
  planningStore: PlanningStore,
  votingStore: VotingStore,
): void {
  const memberOnlyForProposal = async (
    request: { params: { proposalId: string }; authUser?: { sub: string } },
    reply: { code: (n: number) => { send: (b: unknown) => unknown } },
  ) => {
    const ctx = await planningStore.findProposalContext(
      request.params.proposalId,
    );
    if (!ctx) {
      return reply.code(404).send({ error: "not_found" });
    }
    if (!(await groupsStore.isMember(ctx.groupId, request.authUser!.sub))) {
      return reply.code(403).send({ error: "forbidden" });
    }
  };

  const memberOnlyForGroup = async (
    request: { params: { groupId: string }; authUser?: { sub: string } },
    reply: { code: (n: number) => { send: (b: unknown) => unknown } },
  ) => {
    const groupId = request.params.groupId;
    if (!(await groupsStore.getGroup(groupId))) {
      return reply.code(404).send({ error: "not_found" });
    }
    if (!(await groupsStore.isMember(groupId, request.authUser!.sub))) {
      return reply.code(403).send({ error: "forbidden" });
    }
  };

  app.put<{ Params: { proposalId: string }; Body: PutProposalVoteRequest }>(
    "/v1/proposals/:proposalId/vote",
    { preHandler: [requireAuth, memberOnlyForProposal] },
    async (request, reply) => {
      const choice = request.body?.choice;
      if (!isVoteChoice(choice)) {
        return reply.code(400).send({ error: "invalid_choice" });
      }

      const ctx = (await planningStore.findProposalContext(
        request.params.proposalId,
      ))!;
      const userId = request.authUser!.sub;
      const vote = await votingStore.upsertVote(
        request.params.proposalId,
        userId,
        choice,
      );

      await votingStore.tryConfirmFromMajority({
        groupId: ctx.groupId,
        proposalId: ctx.proposal.proposalId,
        planningRunId: ctx.runId,
        summary: ctx.proposal.summary,
        memberCount: (await groupsStore.listMembers(ctx.groupId)).length,
      });

      return vote;
    },
  );

  app.post<{ Params: { proposalId: string } }>(
    "/v1/proposals/:proposalId/veto",
    { preHandler: [requireAuth, memberOnlyForProposal] },
    async (request) =>
      await votingStore.recordVeto(
        request.params.proposalId,
        request.authUser!.sub,
      ),
  );

  app.get<{ Params: { groupId: string } }>(
    "/v1/groups/:groupId/confirmed-event",
    { preHandler: [requireAuth, memberOnlyForGroup] },
    async (request, reply) => {
      const event = await votingStore.getConfirmedEvent(request.params.groupId);
      if (!event) {
        return reply.code(404).send({ error: "not_found" });
      }
      return event;
    },
  );

  app.get<{ Params: { eventId: string } }>(
    "/v1/events/:eventId/calendar.ics",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const event = await votingStore.getConfirmedEventById(
        request.params.eventId,
      );
      if (!event) {
        return reply.code(404).send({ error: "not_found" });
      }
      if (!(await groupsStore.isMember(event.groupId, request.authUser!.sub))) {
        return reply.code(403).send({ error: "forbidden" });
      }

      return reply
        .header("Content-Type", "text/calendar; charset=utf-8")
        .send(confirmedEventToIcs(event));
    },
  );
}
