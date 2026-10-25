import Fastify from "fastify";
import { requireAuth } from "./auth.js";
import { registerGroupRoutes } from "./groups/routes.js";
import { InMemoryGroupsStore, type GroupsStore } from "./groups/store.js";
import { registerPlanningRoutes } from "./planning/routes.js";
import {
  InMemoryPlanningStore,
  type PlanningStore,
} from "./planning/store.js";

export type CreateAppOptions = {
  groupsStore?: GroupsStore;
  planningStore?: PlanningStore;
};

export async function createApp(options: CreateAppOptions = {}) {
  const app = Fastify({ logger: false });
  const groupsStore = options.groupsStore ?? new InMemoryGroupsStore();
  const planningStore = options.planningStore ?? new InMemoryPlanningStore();

  app.get("/v1/health", async () => ({ status: "ok" as const }));

  app.get("/v1/me", { preHandler: requireAuth }, async (request) => ({
    id: request.authUser!.sub,
    profile: {
      displayName: null,
    },
  }));

  registerGroupRoutes(app, groupsStore);
  registerPlanningRoutes(app, groupsStore, planningStore);

  return app;
}
