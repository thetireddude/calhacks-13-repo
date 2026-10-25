import Fastify from "fastify";
import { requireAuth } from "./auth.js";
import { registerGroupRoutes } from "./groups/routes.js";
import { InMemoryGroupsStore, type GroupsStore } from "./groups/store.js";

export type CreateAppOptions = {
  groupsStore?: GroupsStore;
};

export async function createApp(options: CreateAppOptions = {}) {
  const app = Fastify({ logger: false });
  const groupsStore = options.groupsStore ?? new InMemoryGroupsStore();

  app.get("/v1/health", async () => ({ status: "ok" as const }));

  app.get("/v1/me", { preHandler: requireAuth }, async (request) => ({
    id: request.authUser!.sub,
    profile: {
      displayName: null,
    },
  }));

  registerGroupRoutes(app, groupsStore);

  return app;
}
