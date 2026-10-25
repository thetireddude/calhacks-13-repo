import assert from "node:assert/strict";
import { createSecretKey } from "node:crypto";
import test from "node:test";
import type { PlannerInput, PlannerPort, PlannerResult, Proposal } from "@gather/contracts";
import { createPlanner } from "@gather/planner";
import type { CandidateDiscoveryPort } from "@gather/planner";
import { SignJWT } from "jose";
import { createApp } from "./app.js";
import { InMemoryGroupsStore } from "./groups/store.js";
import { InMemoryMemberSetupStore } from "./me/store.js";
import { createDefaultPlannerPort } from "./planner/createPlannerPort.js";
import { InMemoryPlanningStore } from "./planning/store.js";

const TEST_SECRET = "dev-test-jwt-secret-at-least-32-chars!!";

async function token(sub: string): Promise<string> {
  const key = createSecretKey(Buffer.from(TEST_SECRET, "utf8"));
  return new SignJWT({ role: "authenticated" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(sub)
    .setIssuedAt()
    .setExpirationTime("2h")
    .sign(key);
}
const auth = (t: string) => ({ authorization: `Bearer ${t}` });

type Run = { id: string; status: string };

async function setup(plannerPort: PlannerPort, plannerTimeoutMs?: number) {
  process.env.SUPABASE_JWT_SECRET = TEST_SECRET;
  const planningStore = new InMemoryPlanningStore();
  const memberSetupStore = new InMemoryMemberSetupStore();
  const app = await createApp({
    groupsStore: new InMemoryGroupsStore(),
    planningStore,
    memberSetupStore,
    plannerPort,
    plannerTimeoutMs,
  });
  const owner = await token("gate2-owner");
  const g = await app.inject({
    method: "POST",
    url: "/v1/groups",
    headers: auth(owner),
    payload: { name: "Gate2 crew" },
  });
  const groupId = (g.json() as { id: string }).id;
  const createRun = async () => {
    const res = await app.inject({
      method: "POST",
      url: `/v1/groups/${groupId}/planning-runs`,
      headers: auth(owner),
      payload: { activityRequest: "fun night" },
    });
    return res.json() as Run;
  };
  const proposals = async (runId: string) =>
    (
      await app.inject({
        method: "GET",
        url: `/v1/planning-runs/${runId}/proposals`,
        headers: auth(owner),
      })
    ).json() as { proposals: Proposal[] };
  const retry = async (runId: string) =>
    (
      await app.inject({
        method: "POST",
        url: `/v1/planning-runs/${runId}/generate`,
        headers: auth(owner),
      })
    ).json() as Run;
  return { app, owner, groupId, createRun, proposals, retry, planningStore, memberSetupStore };
}

const good = (input: PlannerInput, n = 3): PlannerResult => ({
  planningRunId: input.planningRunId,
  proposals: Array.from({ length: n }, (_, i) => ({
    proposalId: `p-${input.planningRunId}-${i + 1}`,
    rank: i + 1,
    summary: `Option ${i + 1}`,
    explanation: "Popular public activity.",
  })),
});

test("real planner through the API persists and returns 1..3 ranked proposals", async () => {
  const s = await setup(createPlanner());
  const run = await s.createRun();
  assert.equal(run.status, "completed");
  const { proposals } = await s.proposals(run.id);
  assert.ok(proposals.length >= 1 && proposals.length <= 3);
  proposals.forEach((p, i) => {
    assert.equal(p.rank, i + 1);
    assert.equal(typeof p.proposalId, "string");
    assert.ok(p.summary.length > 0);
  });
  assert.equal(new Set(proposals.map((p) => p.proposalId)).size, proposals.length);
  await s.app.close();
});

test("real planner proposals leak no member preference or availability data", async () => {
  const s = await setup(createPlanner());
  const MARKER_TAG = "zz-secret-tag-7731";
  const MARKER_LABEL = "zz-private-label-5521";
  const MARKER_TIME = "2031-03-03T03:33:33Z";
  const prefs = await s.app.inject({
    method: "PUT",
    url: "/v1/me/preferences",
    headers: auth(s.owner),
    payload: {
      activityTags: [MARKER_TAG],
      budgetMin: 1357,
      budgetMax: 2468,
      travelRadiusKm: 97531,
      learningOptIn: true,
    },
  });
  assert.equal(prefs.statusCode, 200);
  const avail = await s.app.inject({
    method: "PUT",
    url: "/v1/me/availability",
    headers: auth(s.owner),
    payload: { windows: [{ startsAt: MARKER_TIME, endsAt: "2031-03-03T05:00:00Z", label: MARKER_LABEL }] },
  });
  assert.equal(avail.statusCode, 200);
  const run = await s.createRun();
  const runBody = JSON.stringify(run);
  const listed = JSON.stringify(await s.proposals(run.id));
  const stored = JSON.stringify(await s.planningStore.listProposals(run.id));
  for (const text of [runBody, listed, stored]) {
    for (const m of [MARKER_TAG, MARKER_TIME, MARKER_LABEL, "budgetMin", "travelRadiusKm", "activityTags"]) {
      assert.ok(!text.includes(m), `leaked ${m}`);
    }
  }
  await s.app.close();
});

test("planner input carries only group id, run id and activity request", async () => {
  let seen: PlannerInput | undefined;
  const s = await setup({
    async generatePlans(input) {
      seen = input;
      return good(input);
    },
  });
  const run = await s.createRun();
  assert.deepEqual(Object.keys(seen!).sort(), ["activityRequest", "groupId", "planningRunId"]);
  assert.equal(seen!.planningRunId, run.id);
  await s.app.close();
});

const invalidOutputs: Array<[string, (i: PlannerInput) => unknown]> = [
  ["no proposals", (i) => good(i, 0)],
  ["mismatched planningRunId", (i) => ({ ...good(i), planningRunId: "other-run" })],
  [
    "duplicate ranks",
    (i) => {
      const r = good(i);
      r.proposals[1]!.rank = 1;
      return r;
    },
  ],
  [
    "duplicate proposalIds",
    (i) => {
      const r = good(i);
      r.proposals[1]!.proposalId = r.proposals[0]!.proposalId;
      return r;
    },
  ],
  [
    "malformed item",
    (i) => {
      const r = good(i);
      (r.proposals[0] as unknown as Record<string, unknown>).rank = "1";
      return r;
    },
  ],
  [
    "empty summary",
    (i) => {
      const r = good(i);
      r.proposals[0]!.summary = "  ";
      return r;
    },
  ],
  [
    "unsafe explanation",
    (i) => {
      const r = good(i);
      r.proposals[2]!.explanation = "Chosen because Sam's calendar is free";
      return r;
    },
  ],
  ["four proposals", (i) => good(i, 4)],
  ["five proposals", (i) => good(i, 5)],
  [
    "four proposals with a bad fourth item",
    (i) => {
      const r = good(i, 4);
      r.proposals[3]!.summary = "";
      return r;
    },
  ],
  [
    "four proposals with rank 1 at index 3",
    (i) => {
      const r = good(i, 4);
      r.proposals[0]!.rank = 4;
      r.proposals[3]!.rank = 1;
      return r;
    },
  ],
  [
    "rank gap",
    (i) => {
      const r = good(i);
      r.proposals[2]!.rank = 4;
      return r;
    },
  ],
  [
    "rank zero",
    (i) => {
      const r = good(i);
      r.proposals[0]!.rank = 0;
      return r;
    },
  ],
  [
    "unsafe summary",
    (i) => {
      const r = good(i);
      r.proposals[1]!.summary = "Based on Sam's availability";
      return r;
    },
  ],
  [
    "oversize summary",
    (i) => {
      const r = good(i);
      r.proposals[0]!.summary = "x".repeat(301);
      return r;
    },
  ],
  [
    "oversize explanation",
    (i) => {
      const r = good(i);
      r.proposals[0]!.explanation = "x".repeat(601);
      return r;
    },
  ],
  [
    "empty explanation",
    (i) => {
      const r = good(i);
      r.proposals[0]!.explanation = "";
      return r;
    },
  ],
  [
    "oversize proposalId",
    (i) => {
      const r = good(i);
      r.proposals[0]!.proposalId = "x".repeat(201);
      return r;
    },
  ],
  [
    "non-string revisionId",
    (i) => {
      const r = good(i);
      (r.proposals[0] as unknown as Record<string, unknown>).revisionId = 7;
      return r;
    },
  ],
  ["non-array proposals", (i) => ({ ...good(i), proposals: "nope" })],
];

for (const [name, make] of invalidOutputs) {
  test(`invalid planner output (${name}) fails the run, persists nothing, retry recovers`, async () => {
    let broken = true;
    const s = await setup({
      async generatePlans(input) {
        return (broken ? make(input) : good(input)) as PlannerResult;
      },
    });
    const run = await s.createRun();
    assert.equal(run.status, "failed");
    assert.deepEqual((await s.proposals(run.id)).proposals, []);
    broken = false;
    const retried = await s.retry(run.id);
    assert.equal(retried.status, "completed");
    assert.equal((await s.proposals(run.id)).proposals.length, 3);
    await s.app.close();
  });
}

test("contiguous out-of-order ranks are persisted and returned in rank order", async () => {
  const s = await setup({
    async generatePlans(input) {
      const r = good(input);
      r.proposals.reverse();
      return r;
    },
  });
  const run = await s.createRun();
  assert.equal(run.status, "completed");
  assert.deepEqual((await s.proposals(run.id)).proposals.map((p) => p.rank), [1, 2, 3]);
  await s.app.close();
});

function captureConsole() {
  const lines: string[] = [];
  const orig = { error: console.error, warn: console.warn };
  console.error = (...a: unknown[]) => void lines.push(a.map(String).join(" "));
  console.warn = (...a: unknown[]) => void lines.push(a.map(String).join(" "));
  return { lines, restore: () => Object.assign(console, orig) };
}

test("throwing planner: only the error class name is logged, never message or payload", async () => {
  class BoomError extends Error {}
  const SECRET = "secret-sam-free-friday@example.com";
  const cap = captureConsole();
  try {
    const s = await setup({
      async generatePlans() {
        throw new BoomError(SECRET);
      },
    });
    const res = await s.app.inject({
      method: "POST",
      url: `/v1/groups/${s.groupId}/planning-runs`,
      headers: auth(s.owner),
      payload: {},
    });
    assert.ok(!res.body.includes(SECRET));
    assert.equal((res.json() as Run).status, "failed");
    const text = cap.lines.join("\n");
    assert.ok(!text.includes(SECRET));
    assert.match(text, /planner_error:BoomError/);
    await s.app.close();
  } finally {
    cap.restore();
  }
});

test("invalid output logs a reason code but no proposal text", async () => {
  const cap = captureConsole();
  try {
    const s = await setup({
      async generatePlans(input) {
        const r = good(input);
        r.proposals[1]!.rank = 1;
        r.proposals[0]!.summary = "PRIVATE-TEXT";
        return r;
      },
    });
    await s.createRun();
    const text = cap.lines.join("\n");
    assert.match(text, /invalid_output:duplicate_rank/);
    assert.ok(!text.includes("PRIVATE-TEXT"));
    await s.app.close();
  } finally {
    cap.restore();
  }
});

test("planner timeout fails the run, logs planner_timeout, and a late result is ignored", async () => {
  const cap = captureConsole();
  try {
    let slow = true;
    const s = await setup(
      {
        async generatePlans(input) {
          if (slow) {
            await new Promise((r) => setTimeout(r, 120));
          }
          return good(input);
        },
      },
      30,
    );
    const run = await s.createRun();
    assert.equal(run.status, "failed");
    assert.match(cap.lines.join("\n"), /planner_timeout/);
    await new Promise((r) => setTimeout(r, 200));
    assert.deepEqual((await s.proposals(run.id)).proposals, []);
    slow = false;
    assert.equal((await s.retry(run.id)).status, "completed");
    await s.app.close();
  } finally {
    cap.restore();
  }
});

test("concurrent generate for one run calls the planner once; others get 409", async () => {
  let calls = 0;
  // Create a failed run first so /generate is allowed, then fire in parallel.
  let fail = true;
  const s2 = await setup({
    async generatePlans(input) {
      calls++;
      if (fail) throw new Error("x");
      await new Promise((r) => setTimeout(r, 50));
      return good(input);
    },
  });
  calls = 0;
  const cap = captureConsole();
  let run: Run;
  try {
    run = await s2.createRun();
  } finally {
    cap.restore();
  }
  assert.equal(run.status, "failed");
  fail = false;
  calls = 0;
  const results = await Promise.all(
    Array.from({ length: 5 }, () =>
      s2.app.inject({
        method: "POST",
        url: `/v1/planning-runs/${run.id}/generate`,
        headers: auth(s2.owner),
      }),
    ),
  );
  const codes = results.map((r) => r.statusCode).sort();
  assert.deepEqual(codes, [200, 409, 409, 409, 409]);
  assert.equal(calls, 1);
  assert.ok(
    results
      .filter((r) => r.statusCode === 409)
      .every((r) => ["generation_in_progress", "already_completed"].includes((r.json() as { error: string }).error)),
  );
  assert.equal((await s2.proposals(run.id)).proposals.length, 3);
  assert.equal(((await s2.app.inject({ method: "GET", url: `/v1/planning-runs/${run.id}`, headers: auth(s2.owner) })).json() as Run).status, "completed");
  await s2.app.close();
});

test("in-flight guard is released after a failure so retry works", async () => {
  let fail = true;
  const cap = captureConsole();
  try {
    const s = await setup({
      async generatePlans(input) {
        if (fail) throw new Error("x");
        return good(input);
      },
    });
    const run = await s.createRun();
    assert.equal(run.status, "failed");
    fail = false;
    assert.equal((await s.retry(run.id)).status, "completed");
    await s.app.close();
  } finally {
    cap.restore();
  }
});

test("real planner fails closed when discovery rejects; run is recoverable", async () => {
  let down = true;
  const discovery: CandidateDiscoveryPort = {
    async discover(query) {
      if (down) throw new Error("provider unavailable");
      return new (await import("@gather/planner")).SeededCandidateDiscovery().discover(query);
    },
  };
  const s = await setup(createPlanner({ discovery }));
  const run = await s.createRun();
  assert.equal(run.status, "failed");
  assert.deepEqual((await s.proposals(run.id)).proposals, []);
  down = false;
  const retried = await s.retry(run.id);
  assert.equal(retried.status, "completed");
  assert.ok((await s.proposals(run.id)).proposals.length >= 1);
  await s.app.close();
});

test("createDefaultPlannerPort is env-gated: mock by default, real with PLANNER_IMPL=real", async () => {
  const input: PlannerInput = { groupId: "g", planningRunId: "run-1" };
  const cap = captureConsole();
  try {
    const mock = await createDefaultPlannerPort({}).generatePlans(input);
    assert.ok(mock.proposals.every((p) => p.proposalId.startsWith("mock-")));
    const other = await createDefaultPlannerPort({ PLANNER_IMPL: "mock" }).generatePlans(input);
    assert.ok(other.proposals.every((p) => p.proposalId.startsWith("mock-")));
    for (const v of ["real", " REAL "]) {
      const real = await createDefaultPlannerPort({ PLANNER_IMPL: v }).generatePlans(input);
      assert.ok(real.proposals.length >= 1);
      assert.ok(real.proposals.every((p) => p.proposalId.startsWith("run-1:")));
    }
    assert.equal(cap.lines.length, 0);
    const typo = await createDefaultPlannerPort({ PLANNER_IMPL: "raal" }).generatePlans(input);
    assert.ok(typo.proposals.every((p) => p.proposalId.startsWith("mock-")));
    assert.equal(cap.lines.length, 1);
    assert.match(cap.lines[0]!, /unknown PLANNER_IMPL/);
  } finally {
    cap.restore();
  }
});
