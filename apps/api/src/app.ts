import Fastify from "fastify";
import { requireAuth } from "./auth.js";
import { registerGroupRoutes } from "./groups/routes.js";
import { InMemoryGroupsStore, type GroupsStore } from "./groups/store.js";
import { registerMemberSetupRoutes } from "./me/routes.js";
import {
  InMemoryMemberSetupStore,
  type MemberSetupStore,
} from "./me/store.js";

export type CreateAppOptions = {
  groupsStore?: GroupsStore;
  memberSetupStore?: MemberSetupStore;
};

export async function createApp(options: CreateAppOptions = {}) {
  const app = Fastify({ logger: false });
  const groupsStore = options.groupsStore ?? new InMemoryGroupsStore();
  const memberSetupStore =
    options.memberSetupStore ?? new InMemoryMemberSetupStore();

  app.get("/v1/health", async () => ({ status: "ok" as const }));

  app.get("/v1/me", { preHandler: requireAuth }, async (request) => ({
    id: request.authUser!.sub,
    profile: {
      displayName: null,
    },
  }));

  registerGroupRoutes(app, groupsStore);
  registerMemberSetupRoutes(app, memberSetupStore);

  return app;
}
