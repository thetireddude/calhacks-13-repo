import type { FastifyInstance } from "fastify";
import { requireAuth } from "../auth.js";
import type { ProfileStore } from "./profileStore.js";

export function registerProfileRoutes(
  app: FastifyInstance,
  store: ProfileStore,
): void {
  app.get("/v1/me", { preHandler: requireAuth }, async (request) =>
    store.getOrCreateProfile(request.authUser!.sub),
  );
}
