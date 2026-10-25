import type { FastifyInstance } from "fastify";
import { requireAuth } from "../auth.js";
import type { ProfileStore } from "./profileStore.js";

function parsePutMeBody(body: unknown): { displayName: string | null } | undefined {
  if (!body || typeof body !== "object") {
    return undefined;
  }
  const profile = (body as { profile?: unknown }).profile;
  if (!profile || typeof profile !== "object") {
    return undefined;
  }
  const displayName = (profile as { displayName?: unknown }).displayName;
  if (displayName !== null && typeof displayName !== "string") {
    return undefined;
  }
  return { displayName };
}

export function registerProfileRoutes(
  app: FastifyInstance,
  store: ProfileStore,
): void {
  app.get("/v1/me", { preHandler: requireAuth }, async (request) =>
    store.getOrCreateProfile(request.authUser!.sub),
  );

  app.put("/v1/me", { preHandler: requireAuth }, async (request, reply) => {
    const parsed = parsePutMeBody(request.body);
    if (!parsed) {
      return reply.code(400).send({ error: "invalid_body" });
    }
    return store.updateDisplayName(request.authUser!.sub, parsed.displayName);
  });
}
