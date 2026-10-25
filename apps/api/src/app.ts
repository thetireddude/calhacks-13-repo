import Fastify from "fastify";
import { requireAuth } from "./auth.js";

export async function createApp() {
  const app = Fastify({ logger: false });

  app.get("/v1/health", async () => ({ status: "ok" as const }));

  app.get("/v1/me", { preHandler: requireAuth }, async (request) => ({
    id: request.authUser!.sub,
  }));

  return app;
}
