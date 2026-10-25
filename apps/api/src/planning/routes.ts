import type { FastifyInstance } from "fastify";
import type { CreatePlanningRunRequest } from "@gather/contracts";
import { requireAuth } from "../auth.js";
import type { GroupsStore } from "../groups/store.js";
import type { PlanningStore } from "./store.js";

export function registerPlanningRoutes(
  app: FastifyInstance,
  groupsStore: GroupsStore,
  planningStore: PlanningStore,
): void {
  const memberOnlyForGroup = async (
    request: { params: { groupId: string }; authUser?: { sub: string } },
    reply: { code: (n: number) => { send: (b: unknown) => unknown } },
  ) => {
    const userId = request.authUser!.sub;
    const groupId = request.params.groupId;
    if (!groupsStore.getGroup(groupId)) {
      return reply.code(404).send({ error: "not_found" });
    }
    if (!groupsStore.isMember(groupId, userId)) {
      return reply.code(403).send({ error: "forbidden" });
    }
  };

  const memberOnlyForRun = async (
    request: { params: { runId: string }; authUser?: { sub: string } },
    reply: { code: (n: number) => { send: (b: unknown) => unknown } },
  ) => {
    const run = planningStore.getRun(request.params.runId);
    if (!run) {
      return reply.code(404).send({ error: "not_found" });
    }
    if (!groupsStore.isMember(run.groupId, request.authUser!.sub)) {
      return reply.code(403).send({ error: "forbidden" });
    }
  };

  app.post<{ Params: { groupId: string }; Body: CreatePlanningRunRequest }>(
    "/v1/groups/:groupId/planning-runs",
    { preHandler: [requireAuth, memberOnlyForGroup] },
    async (request, reply) => {
      const activityRequest = request.body?.activityRequest;
      const run = planningStore.createRun(
        request.params.groupId,
        request.authUser!.sub,
        typeof activityRequest === "string" ? activityRequest : undefined,
      );
      return reply.code(201).send(run);
    },
  );

  app.get<{ Params: { runId: string } }>(
    "/v1/planning-runs/:runId",
    { preHandler: [requireAuth, memberOnlyForRun] },
    async (request) => planningStore.getRun(request.params.runId)!,
  );

  app.get<{ Params: { runId: string } }>(
    "/v1/planning-runs/:runId/proposals",
    { preHandler: [requireAuth, memberOnlyForRun] },
    async (request) => ({
      proposals: planningStore.listProposals(request.params.runId),
    }),
  );
}
