import assert from "node:assert/strict";
import { test } from "node:test";

import { createApp } from "./app.js";

test("GET /v1/health returns ok", async () => {
  const app = await createApp();
  const response = await app.inject({ method: "GET", url: "/v1/health" });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), { status: "ok" });

  await app.close();
});

test("GET /v1/health reflects Origin for CORS", async () => {
  const app = await createApp();
  const origin = "http://localhost:8081";
  const response = await app.inject({
    method: "GET",
    url: "/v1/health",
    headers: { origin },
  });

  assert.equal(response.statusCode, 200);
  assert.equal(response.headers["access-control-allow-origin"], origin);

  await app.close();
});

test("OPTIONS /v1/health answers CORS preflight", async () => {
  const app = await createApp();
  const origin = "http://localhost:8081";
  const response = await app.inject({
    method: "OPTIONS",
    url: "/v1/health",
    headers: {
      origin,
      "access-control-request-method": "GET",
    },
  });

  assert.equal(response.statusCode, 204);
  assert.equal(response.headers["access-control-allow-origin"], origin);

  await app.close();
});
