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
      const vote = votingStore.upsertVote(
        request.params.proposalId,
        userId,
        choice,
      );

      votingStore.tryConfirmFromMajority({
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
      votingStore.recordVeto(request.params.proposalId, request.authUser!.sub),
  );

  app.get<{ Params: { groupId: string } }>(
    "/v1/groups/:groupId/confirmed-event",
    { preHandler: [requireAuth, memberOnlyForGroup] },
    async (request, reply) => {
      const event = votingStore.getConfirmedEvent(request.params.groupId);
      if (!event) {
        return reply.code(404).send({ error: "not_found" });
      }
      return event;
    },
  );
}
