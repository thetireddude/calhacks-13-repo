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
