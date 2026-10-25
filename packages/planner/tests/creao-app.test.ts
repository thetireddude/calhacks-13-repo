import assert from "node:assert/strict";
import test from "node:test";

import { CreaoAppEvaluationProvider } from "../src/provider.js";

test("Creao app adapter creates and polls an isolated app run", async () => {
  const requests: Array<{ url: string; init?: RequestInit }> = [];
  const provider = new CreaoAppEvaluationProvider(
    { appId: "app-1", apiKey: "capi_test", baseUrl: "https://agent.example", pollIntervalMs: 0 },
    async (url, init) => {
      requests.push({ url: String(url), init });
      if (init?.method === "POST") return new Response(JSON.stringify({ id: "run-1" }), { status: 201 });
      return new Response(JSON.stringify({ status: "completed", result: { text: JSON.stringify({ feasible: true, preferenceTags: ["outdoors"], explanation: "The public activity matches the supplied tag." }) } }), { status: 200 });
    },
  );
  const result = await provider.evaluate({ permitted_preferences: "outdoors", proposed_activity: "park walk" });
  assert.equal(result.feasible, true);
  assert.equal(requests.length, 2);
  assert.equal(requests[0]?.url, "https://agent.example/api/v1/apps/app-1/runs");
  assert.deepEqual(JSON.parse(String(requests[0]?.init?.body)), { inputs: { permitted_preferences: "outdoors", proposed_activity: "park walk" } });
  assert.equal(requests[1]?.url, "https://agent.example/api/v1/apps/app-1/runs/run-1");
});

test("Creao app adapter rejects malformed provider output", async () => {
  const provider = new CreaoAppEvaluationProvider(
    { appId: "app-1", apiKey: "capi_test", baseUrl: "https://agent.example", pollIntervalMs: 0 },
    async (_url, init) => init?.method === "POST"
      ? new Response(JSON.stringify({ id: "run-1" }), { status: 201 })
      : new Response(JSON.stringify({ status: "completed", result: { text: "not json" } }), { status: 200 }),
  );
  await assert.rejects(provider.evaluate({ permitted_preferences: "outdoors", proposed_activity: "park walk" }), SyntaxError);
});

test("Creao app adapter honors a rate-limited poll", async () => {
  let pollCount = 0;
  const provider = new CreaoAppEvaluationProvider(
    { appId: "app-1", apiKey: "capi_test", baseUrl: "https://agent.example", pollIntervalMs: 0 },
    async (_url, init) => {
      if (init?.method === "POST") return new Response(JSON.stringify({ id: "run-1" }), { status: 201 });
      pollCount += 1;
      if (pollCount === 1) return new Response(null, { status: 429, headers: { "retry-after": "0" } });
      return new Response(JSON.stringify({ status: "completed", result: { text: JSON.stringify({ feasible: true, preferenceTags: ["outdoors"], explanation: "The public activity matches the supplied tag." }) } }), { status: 200 });
    },
  );
  const result = await provider.evaluate({ permitted_preferences: "outdoors", proposed_activity: "park walk" });
  assert.equal(result.feasible, true);
  assert.equal(pollCount, 2);
});

test("Creao app adapter normalizes the completed live response encoding", async () => {
  const provider = new CreaoAppEvaluationProvider(
    { appId: "app-1", apiKey: "capi_test", baseUrl: "https://agent.example", pollIntervalMs: 0 },
    async (_url, init) => init?.method === "POST"
      ? new Response(JSON.stringify({ id: "run-1" }), { status: 201 })
      : new Response(JSON.stringify({ status: "completed", result: { text: JSON.stringify({ feasible: "true", preferenceTags: "outdoors, low-cost", explanation: "The public activity matches the supplied tags." }) } }), { status: 200 }),
  );
  const result = await provider.evaluate({ permitted_preferences: "outdoors", proposed_activity: "park walk" });
  assert.deepEqual(result, {
    feasible: true,
    preferenceTags: ["outdoors", "low-cost"],
    explanation: "The public activity matches the supplied tags.",
  });
});
