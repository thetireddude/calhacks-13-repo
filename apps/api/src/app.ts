import cors from "@fastify/cors";
import Fastify from "fastify";
import { registerGroupRoutes } from "./groups/routes.js";
import { createDefaultGroupsStore } from "./groups/createGroupsStore.js";
import type { GroupsStore } from "./groups/store.js";
import { createDefaultMemberSetupStore } from "./me/createMemberSetupStore.js";
import { createDefaultProfileStore } from "./me/createProfileStore.js";
import { registerProfileRoutes } from "./me/profileRoutes.js";
import type { ProfileStore } from "./me/profileStore.js";
import { registerMemberSetupRoutes } from "./me/routes.js";
import type { MemberSetupStore } from "./me/store.js";
import { createMockPlannerPort } from "./planner/mockPlannerPort.js";
import { createDefaultPlanningStore } from "./planning/createPlanningStore.js";
import { registerPlanningRoutes } from "./planning/routes.js";
import type { PlanningStore } from "./planning/store.js";
import { createDefaultVotingStore } from "./voting/createVotingStore.js";
import { registerNotificationRoutes } from "./notifications/routes.js";
import { registerVotingRoutes } from "./voting/routes.js";
import type { VotingStore } from "./voting/store.js";
import type { PlannerPort } from "@gather/contracts";

export type CreateAppOptions = {
  groupsStore?: GroupsStore;
  profileStore?: ProfileStore;
  memberSetupStore?: MemberSetupStore;
  planningStore?: PlanningStore;
  votingStore?: VotingStore;
  plannerPort?: PlannerPort;
};

export async function createApp(options: CreateAppOptions = {}) {
  const app = Fastify({ logger: false });
  await app.register(cors, { origin: true });
  const groupsStore = options.groupsStore ?? createDefaultGroupsStore();
  const profileStore = options.profileStore ?? createDefaultProfileStore();
  const memberSetupStore =
    options.memberSetupStore ?? createDefaultMemberSetupStore();
  const planningStore = options.planningStore ?? createDefaultPlanningStore();
  const votingStore = options.votingStore ?? createDefaultVotingStore();
  const plannerPort = options.plannerPort ?? createMockPlannerPort();

  app.get("/v1/health", async () => ({ status: "ok" as const }));

  registerProfileRoutes(app, profileStore);
  registerGroupRoutes(app, groupsStore);
  registerMemberSetupRoutes(app, memberSetupStore);
  registerPlanningRoutes(app, groupsStore, planningStore, plannerPort);
  registerVotingRoutes(app, groupsStore, planningStore, votingStore);
  registerNotificationRoutes(app, groupsStore, planningStore, votingStore);

  return app;
}
