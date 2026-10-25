import assert from "node:assert/strict";
import { createSecretKey } from "node:crypto";
import test from "node:test";
import { SignJWT } from "jose";
import type { Proposal } from "@gather/contracts";
import { createApp } from "./app.js";
import { InMemoryGroupsStore } from "./groups/store.js";
import { InMemoryPlanningStore } from "./planning/store.js";
import { createDefaultVotingStore } from "./voting/createVotingStore.js";
import { InMemoryVotingStore } from "./voting/store.js";
import { SupabaseVotingStore } from "./voting/supabaseStore.js";

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

async function seedGroupWithProposal(
  groupsStore: InMemoryGroupsStore,
  planningStore: InMemoryPlanningStore,
  memberIds: string[],
  proposalId = "prop-vote-1",
): Promise<{ groupId: string; runId: string; proposalId: string }> {
  const owner = memberIds[0] ?? "owner-vote";
  const group = await groupsStore.createGroup("Vote crew", owner);
  for (const id of memberIds.slice(1)) {
    await groupsStore.joinGroup(group.id, id);
  }
  const run = await planningStore.createRun(group.id, owner, "dinner");
  const proposals: Proposal[] = [
    {
      proposalId,
      rank: 1,
      summary: "Friday tacos",
    },
  ];
  await planningStore.completeRun(run.id, proposals);
  return { groupId: group.id, runId: run.id, proposalId };
}

test("voting routes return 401 without JWT", async () => {
  process.env.SUPABASE_JWT_SECRET = TEST_SECRET;
  const app = await createApp({
    groupsStore: new InMemoryGroupsStore(),
    planningStore: new InMemoryPlanningStore(),
    votingStore: new InMemoryVotingStore(),
  });
  const cases = [
    {
      method: "PUT" as const,
      url: "/v1/proposals/some-id/vote",
      payload: { choice: "approve" },
    },
    { method: "POST" as const, url: "/v1/proposals/some-id/veto" },
    {
      method: "GET" as const,
      url: "/v1/groups/00000000-0000-4000-8000-000000000099/confirmed-event",
    },
  ];
  for (const c of cases) {
    const res = await app.inject({ ...c });
    assert.equal(res.statusCode, 401, c.url);
  }
  await app.close();
});

test("vote and veto return 404 for unknown proposal; 403 for non-member", async () => {
  process.env.SUPABASE_JWT_SECRET = TEST_SECRET;
  const groupsStore = new InMemoryGroupsStore();
  const planningStore = new InMemoryPlanningStore();
  const votingStore = new InMemoryVotingStore();
  const app = await createApp({ groupsStore, planningStore, votingStore });

  const outsiderToken = await signTestToken("outsider-vote");
  const unknownRes = await app.inject({
    method: "PUT",
    url: "/v1/proposals/missing-proposal/vote",
    headers: authHeaders(outsiderToken),
    payload: { choice: "approve" },
  });
  assert.equal(unknownRes.statusCode, 404);

  const { proposalId } = await seedGroupWithProposal(
    groupsStore,
    planningStore,
    ["member-a"],
  );
  const forbiddenRes = await app.inject({
    method: "PUT",
    url: `/v1/proposals/${proposalId}/vote`,
    headers: authHeaders(outsiderToken),
    payload: { choice: "approve" },
  });
  assert.equal(forbiddenRes.statusCode, 403);

  await app.close();
});

test("PUT vote upserts idempotently per user", async () => {
  process.env.SUPABASE_JWT_SECRET = TEST_SECRET;
  const groupsStore = new InMemoryGroupsStore();
  const planningStore = new InMemoryPlanningStore();
  const votingStore = new InMemoryVotingStore();
  const app = await createApp({ groupsStore, planningStore, votingStore });
  const { proposalId } = await seedGroupWithProposal(
    groupsStore,
    planningStore,
    ["voter-1"],
  );
  const token = await signTestToken("voter-1");

  const first = await app.inject({
    method: "PUT",
    url: `/v1/proposals/${proposalId}/vote`,
    headers: authHeaders(token),
    payload: { choice: "approve" },
  });
  assert.equal(first.statusCode, 200);
  const firstBody = first.json() as { choice: string; updatedAt: string };
  assert.equal(firstBody.choice, "approve");

  const second = await app.inject({
    method: "PUT",
    url: `/v1/proposals/${proposalId}/vote`,
    headers: authHeaders(token),
    payload: { choice: "approve" },
  });
  assert.equal(second.statusCode, 200);
  const secondBody = second.json() as { choice: string; updatedAt: string };
  assert.equal(secondBody.choice, "approve");
  assert.equal(await votingStore.countApprovals(proposalId), 1);

  const change = await app.inject({
    method: "PUT",
    url: `/v1/proposals/${proposalId}/vote`,
    headers: authHeaders(token),
    payload: { choice: "cant_make_it" },
  });
  assert.equal(change.statusCode, 200);
  assert.equal(
    (change.json() as { choice: string }).choice,
    "cant_make_it",
  );
  assert.equal(await votingStore.countApprovals(proposalId), 0);

  await app.close();
});

test("POST veto is distinct from cant_make_it vote", async () => {
  process.env.SUPABASE_JWT_SECRET = TEST_SECRET;
  const groupsStore = new InMemoryGroupsStore();
  const planningStore = new InMemoryPlanningStore();
  const votingStore = new InMemoryVotingStore();
  const app = await createApp({ groupsStore, planningStore, votingStore });
  const { proposalId } = await seedGroupWithProposal(
    groupsStore,
    planningStore,
    ["veto-user"],
  );
  const token = await signTestToken("veto-user");

  const vetoRes = await app.inject({
    method: "POST",
    url: `/v1/proposals/${proposalId}/veto`,
    headers: authHeaders(token),
  });
  assert.equal(vetoRes.statusCode, 200);
  assert.deepEqual(vetoRes.json(), {
    ...(await votingStore.getVeto(proposalId, "veto-user")),
  });

  const voteRes = await app.inject({
    method: "PUT",
    url: `/v1/proposals/${proposalId}/vote`,
    headers: authHeaders(token),
    payload: { choice: "cant_make_it" },
  });
  assert.equal(voteRes.statusCode, 200);
  assert.ok(await votingStore.getVeto(proposalId, "veto-user"));
  assert.equal(
    (await votingStore.getVote(proposalId, "veto-user"))?.choice,
    "cant_make_it",
  );

  await app.close();
});

test("stub majority confirms once; concurrent approvals do not duplicate", async () => {
  process.env.SUPABASE_JWT_SECRET = TEST_SECRET;
  const groupsStore = new InMemoryGroupsStore();
  const planningStore = new InMemoryPlanningStore();
  const votingStore = new InMemoryVotingStore();
  const app = await createApp({ groupsStore, planningStore, votingStore });

  const members = ["m1", "m2", "m3", "m4"];
  const { groupId, proposalId } = await seedGroupWithProposal(
    groupsStore,
    planningStore,
    members,
  );

  const tokens = await Promise.all(members.map((m) => signTestToken(m)));

  const [resA, resB] = await Promise.all([
    app.inject({
      method: "PUT",
      url: `/v1/proposals/${proposalId}/vote`,
      headers: authHeaders(tokens[0]!),
      payload: { choice: "approve" },
    }),
    app.inject({
      method: "PUT",
      url: `/v1/proposals/${proposalId}/vote`,
      headers: authHeaders(tokens[1]!),
      payload: { choice: "approve" },
    }),
  ]);
  assert.equal(resA.statusCode, 200);
  assert.equal(resB.statusCode, 200);

  const confirmedRes = await app.inject({
    method: "GET",
    url: `/v1/groups/${groupId}/confirmed-event`,
    headers: authHeaders(tokens[2]!),
  });
  assert.equal(confirmedRes.statusCode, 200);
  const event = confirmedRes.json() as {
    id: string;
    groupId: string;
    proposalId: string;
    summary: string;
  };
  assert.equal(event.groupId, groupId);
  assert.equal(event.proposalId, proposalId);
  assert.equal(event.summary, "Friday tacos");

  const again = await app.inject({
    method: "GET",
    url: `/v1/groups/${groupId}/confirmed-event`,
    headers: authHeaders(tokens[3]!),
  });
  assert.equal((again.json() as { id: string }).id, event.id);

  await app.close();
});

test("tryConfirmFromMajority is idempotent under concurrent calls", async () => {
  const store = new InMemoryVotingStore();
  const proposalId = "p-concurrent";
  await store.upsertVote(proposalId, "u1", "approve");
  await store.upsertVote(proposalId, "u2", "approve");

  const input = {
    groupId: "g1",
    proposalId,
    planningRunId: "run-1",
    summary: "Plan A",
    memberCount: 4,
  };

  const results = await Promise.all(
    Array.from({ length: 50 }, () => store.tryConfirmFromMajority(input)),
  );
  const ids = new Set(results.filter(Boolean).map((r) => r!.id));
  assert.equal(ids.size, 1);
});

test("GET confirmed-event returns 404 for unknown group and when none confirmed", async () => {
  process.env.SUPABASE_JWT_SECRET = TEST_SECRET;
  const groupsStore = new InMemoryGroupsStore();
  const planningStore = new InMemoryPlanningStore();
  const app = await createApp({
    groupsStore,
    planningStore,
    votingStore: new InMemoryVotingStore(),
  });
  const token = await signTestToken("reader-1");
  const group = await groupsStore.createGroup("Empty", "reader-1");

  const missingGroup = await app.inject({
    method: "GET",
    url: "/v1/groups/00000000-0000-4000-8000-000000000088/confirmed-event",
    headers: authHeaders(token),
  });
  assert.equal(missingGroup.statusCode, 404);

  const noEvent = await app.inject({
    method: "GET",
    url: `/v1/groups/${group.id}/confirmed-event`,
    headers: authHeaders(token),
  });
  assert.equal(noEvent.statusCode, 404);

  await app.close();
});

test("createDefaultVotingStore is env-gated", () => {
  const prevUrl = process.env.SUPABASE_URL;
  const prevKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  try {
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    assert.ok(createDefaultVotingStore() instanceof InMemoryVotingStore);

    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";
    assert.ok(createDefaultVotingStore() instanceof SupabaseVotingStore);
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
