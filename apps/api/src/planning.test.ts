import assert from "node:assert/strict";
import { createSecretKey } from "node:crypto";
import test from "node:test";
import { SignJWT } from "jose";
import { createApp } from "./app.js";
import { InMemoryGroupsStore } from "./groups/store.js";
import { createDefaultPlanningStore } from "./planning/createPlanningStore.js";
import { InMemoryPlanningStore } from "./planning/store.js";
import { SupabasePlanningStore } from "./planning/supabaseStore.js";

const TEST_SECRET = "dev-test-jwt-secret-at-least-32-chars!!";

async function signTestToken(sub: string): Promise<string> {
  const key = createSecretKey(Buffer.from(TEST_SECRET, "utf8"));
  return new SignJWT({ role: "authenticated" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(sub)
    .setIssuedAt()
    .setExpirationTime("2h")
    .sign(key);
}

function authHeaders(token: string) {
  return { authorization: `Bearer ${token}` };
}

test("planning routes return 401 without JWT", async () => {
  process.env.SUPABASE_JWT_SECRET = TEST_SECRET;
  const app = await createApp({
    groupsStore: new InMemoryGroupsStore(),
    planningStore: new InMemoryPlanningStore(),
  });
  const groupId = "00000000-0000-4000-8000-000000000001";
  const runId = "00000000-0000-4000-8000-000000000002";
  const cases = [
    { method: "POST" as const, url: `/v1/groups/${groupId}/planning-runs` },
    { method: "GET" as const, url: `/v1/planning-runs/${runId}` },
    { method: "GET" as const, url: `/v1/planning-runs/${runId}/proposals` },
  ];
  for (const c of cases) {
    const res = await app.inject({ ...c });
    assert.equal(res.statusCode, 401, c.url);
  }
  await app.close();
});

test("planning run create and fetch; non-member returns 403", async () => {
  process.env.SUPABASE_JWT_SECRET = TEST_SECRET;
  const groupsStore = new InMemoryGroupsStore();
  const planningStore = new InMemoryPlanningStore();
  const app = await createApp({ groupsStore, planningStore });
  const ownerToken = await signTestToken("owner-plan");
  const outsiderToken = await signTestToken("outsider-plan");

  const createGroupRes = await app.inject({
    method: "POST",
    url: "/v1/groups",
    headers: authHeaders(ownerToken),
    payload: { name: "Plan crew" },
  });
  const groupId = (createGroupRes.json() as { id: string }).id;

  const forbiddenCreate = await app.inject({
    method: "POST",
    url: `/v1/groups/${groupId}/planning-runs`,
    headers: authHeaders(outsiderToken),
    payload: { activityRequest: "dinner" },
  });
  assert.equal(forbiddenCreate.statusCode, 403);
  assert.deepEqual(forbiddenCreate.json(), { error: "forbidden" });

  const createRunRes = await app.inject({
    method: "POST",
    url: `/v1/groups/${groupId}/planning-runs`,
    headers: authHeaders(ownerToken),
    payload: { activityRequest: "weekend hike" },
  });
  assert.equal(createRunRes.statusCode, 201);
  const run = createRunRes.json() as {
    id: string;
    groupId: string;
    status: string;
    initiatedBy: string;
    activityRequest: string;
  };
  assert.equal(run.groupId, groupId);
  assert.equal(run.status, "completed");
  assert.equal(run.initiatedBy, "owner-plan");
  assert.equal(run.activityRequest, "weekend hike");
  assert.ok(run.id.length > 8);

  const forbiddenGet = await app.inject({
    method: "GET",
    url: `/v1/planning-runs/${run.id}`,
    headers: authHeaders(outsiderToken),
  });
  assert.equal(forbiddenGet.statusCode, 403);

  const getRunRes = await app.inject({
    method: "GET",
    url: `/v1/planning-runs/${run.id}`,
    headers: authHeaders(ownerToken),
  });
  assert.equal(getRunRes.statusCode, 200);
  assert.equal((getRunRes.json() as { id: string }).id, run.id);

  const proposalsRes = await app.inject({
    method: "GET",
    url: `/v1/planning-runs/${run.id}/proposals`,
    headers: authHeaders(ownerToken),
  });
  assert.equal(proposalsRes.statusCode, 200);
  const proposalsBody = proposalsRes.json() as {
    proposals: { rank: number; summary: string }[];
  };
  assert.equal(proposalsBody.proposals.length, 3);
  assert.ok(
    proposalsBody.proposals.every((p) => p.summary.includes("weekend hike")),
  );
  assert.ok(
    proposalsBody.proposals.every(
      (p) => !p.summary.includes("owner-plan") && !p.summary.includes("@"),
    ),
  );

  const forbiddenProposals = await app.inject({
    method: "GET",
    url: `/v1/planning-runs/${run.id}/proposals`,
    headers: authHeaders(outsiderToken),
  });
  assert.equal(forbiddenProposals.statusCode, 403);

  await app.close();
});

test("planner failure marks run failed; retry generate completes with proposals", async () => {
  process.env.SUPABASE_JWT_SECRET = TEST_SECRET;
  const groupsStore = new InMemoryGroupsStore();
  const planningStore = new InMemoryPlanningStore();
  let calls = 0;
  const flakyPlanner = {
    async generatePlans(input: { planningRunId: string }) {
      calls += 1;
      if (calls === 1) {
        throw new Error("planner unavailable");
      }
      return {
        planningRunId: input.planningRunId,
        proposals: [
          {
            proposalId: "retry-1",
            rank: 1,
            summary: "Recovered option",
          },
        ],
        generatedAt: new Date().toISOString(),
      };
    },
  };
  const app = await createApp({
    groupsStore,
    planningStore,
    plannerPort: flakyPlanner,
  });
  const token = await signTestToken("retry-user");
  const groupRes = await app.inject({
    method: "POST",
    url: "/v1/groups",
    headers: authHeaders(token),
    payload: { name: "Retry club" },
  });
  const groupId = (groupRes.json() as { id: string }).id;

  const createRunRes = await app.inject({
    method: "POST",
    url: `/v1/groups/${groupId}/planning-runs`,
    headers: authHeaders(token),
    payload: {},
  });
  const run = createRunRes.json() as { id: string; status: string };
  assert.equal(run.status, "failed");

  const emptyProposals = await app.inject({
    method: "GET",
    url: `/v1/planning-runs/${run.id}/proposals`,
    headers: authHeaders(token),
  });
  assert.deepEqual(emptyProposals.json(), { proposals: [] });

  const retryRes = await app.inject({
    method: "POST",
    url: `/v1/planning-runs/${run.id}/generate`,
    headers: authHeaders(token),
  });
  assert.equal(retryRes.statusCode, 200);
  assert.equal((retryRes.json() as { status: string }).status, "completed");

  const proposalsRes = await app.inject({
    method: "GET",
    url: `/v1/planning-runs/${run.id}/proposals`,
    headers: authHeaders(token),
  });
  assert.equal(
    (proposalsRes.json() as { proposals: unknown[] }).proposals.length,
    1,
  );

  await app.close();
});

test("planner output with more than three proposals is rejected (fail closed), none persisted", async () => {
  process.env.SUPABASE_JWT_SECRET = TEST_SECRET;
  const planningStore = new InMemoryPlanningStore();
  const app = await createApp({
    groupsStore: new InMemoryGroupsStore(),
    planningStore,
    plannerPort: {
      async generatePlans(input) {
        return {
          planningRunId: input.planningRunId,
          proposals: [1, 2, 3, 4, 5].map((rank) => ({
            proposalId: `p-${rank}`,
            rank,
            summary: `Plan ${rank}`,
          })),
        };
      },
    },
  });
  const token = await signTestToken("cap-user");
  const g = await app.inject({
    method: "POST",
    url: "/v1/groups",
    headers: authHeaders(token),
    payload: { name: "Cap" },
  });
  const groupId = (g.json() as { id: string }).id;
  const runRes = await app.inject({
    method: "POST",
    url: `/v1/groups/${groupId}/planning-runs`,
    headers: authHeaders(token),
    payload: {},
  });
  const runId = (runRes.json() as { id: string }).id;
  const proposalsRes = await app.inject({
    method: "GET",
    url: `/v1/planning-runs/${runId}/proposals`,
    headers: authHeaders(token),
  });
  assert.equal(
    (proposalsRes.json() as { proposals: unknown[] }).proposals.length,
    0,
  );
  await app.close();
});

test("createDefaultPlanningStore is env-gated", () => {
  const prevUrl = process.env.SUPABASE_URL;
  const prevKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  try {
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    assert.ok(createDefaultPlanningStore() instanceof InMemoryPlanningStore);

    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";
    assert.ok(createDefaultPlanningStore() instanceof SupabasePlanningStore);
  } finally {
    if (prevUrl === undefined) {
      delete process.env.SUPABASE_URL;
    } else {
      process.env.SUPABASE_URL = prevUrl;
    }
    if (prevKey === undefined) {
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    } else {
      process.env.SUPABASE_SERVICE_ROLE_KEY = prevKey;
    }
  }
});
