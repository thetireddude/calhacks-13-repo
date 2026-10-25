import Fastify from "fastify";

export async function createApp() {
  const app = Fastify({ logger: false });

  app.get("/v1/health", async () => ({ status: "ok" as const }));

  return app;
}
