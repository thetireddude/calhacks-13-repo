import Fastify from "fastify";
import { requireAuth } from "./auth.js";
import { registerGroupRoutes } from "./groups/routes.js";
import { InMemoryGroupsStore, type GroupsStore } from "./groups/store.js";
import { registerMemberSetupRoutes } from "./me/routes.js";
import {
  InMemoryMemberSetupStore,
  type MemberSetupStore,
} from "./me/store.js";
import { createMockPlannerPort } from "./planner/mockPlannerPort.js";
import { registerPlanningRoutes } from "./planning/routes.js";
import {
  InMemoryPlanningStore,
  type PlanningStore,
} from "./planning/store.js";
import type { PlannerPort } from "@gather/contracts";

export type CreateAppOptions = {
  groupsStore?: GroupsStore;
  memberSetupStore?: MemberSetupStore;
  planningStore?: PlanningStore;
  plannerPort?: PlannerPort;
};

export async function createApp(options: CreateAppOptions = {}) {
  const app = Fastify({ logger: false });
  const groupsStore = options.groupsStore ?? new InMemoryGroupsStore();
  const memberSetupStore =
    options.memberSetupStore ?? new InMemoryMemberSetupStore();
  const planningStore = options.planningStore ?? new InMemoryPlanningStore();
  const plannerPort = options.plannerPort ?? createMockPlannerPort();

  app.get("/v1/health", async () => ({ status: "ok" as const }));

  app.get("/v1/me", { preHandler: requireAuth }, async (request) => ({
    id: request.authUser!.sub,
    profile: {
      displayName: null,
    },
  }));

  registerGroupRoutes(app, groupsStore);
  registerMemberSetupRoutes(app, memberSetupStore);
  registerPlanningRoutes(app, groupsStore, planningStore, plannerPort);

  return app;
}
