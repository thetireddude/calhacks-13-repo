import assert from "node:assert/strict";
import { createSecretKey } from "node:crypto";
import test from "node:test";
import { SignJWT } from "jose";
import type { Proposal } from "@gather/contracts";
import { createApp } from "./app.js";
import { InMemoryGroupsStore } from "./groups/store.js";
import { InMemoryPlanningStore } from "./planning/store.js";
import { InMemoryVotingStore } from "./voting/store.js";

const TEST_SECRET = "dev-test-jwt-secret-at-least-32-chars!!";

const ALLOWED_KEYS = new Set([
  "type",
  "groupId",
  "eventId",
  "summary",
  "createdAt",
]);

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

async function seedConfirmedEvent(
  groupsStore: InMemoryGroupsStore,
  planningStore: InMemoryPlanningStore,
  votingStore: InMemoryVotingStore,
  owner: string,
  extraMembers: string[],
  summary: string,
  proposalId: string,
): Promise<{ groupId: string; eventId: string; summary: string; confirmedAt: string }> {
  const group = await groupsStore.createGroup("Notify crew", owner);
  for (const id of extraMembers) {
    await groupsStore.joinGroup(group.id, id);
  }
  const run = await planningStore.createRun(group.id, owner, "dinner");
  const proposals: Proposal[] = [{ proposalId, rank: 1, summary }];
  await planningStore.completeRun(run.id, proposals);
  await votingStore.upsertVote(proposalId, owner, "approve");
  const confirmed = await votingStore.tryConfirmFromMajority({
    groupId: group.id,
    proposalId,
    planningRunId: run.id,
    summary,
    memberCount: 1 + extraMembers.length,
  });
  assert.ok(confirmed);
  return {
    groupId: group.id,
    eventId: confirmed.id,
    summary: confirmed.summary,
    confirmedAt: confirmed.confirmedAt,
  };
}

test("GET /v1/me/notifications returns 401 without JWT", async () => {
  process.env.SUPABASE_JWT_SECRET = TEST_SECRET;
  const app = await createApp({
    groupsStore: new InMemoryGroupsStore(),
    planningStore: new InMemoryPlanningStore(),
    votingStore: new InMemoryVotingStore(),
  });
  const res = await app.inject({ method: "GET", url: "/v1/me/notifications" });
  assert.equal(res.statusCode, 401);
  await app.close();
});

test("GET /v1/me/notifications derives event_confirmed items from member groups only", async () => {
  process.env.SUPABASE_JWT_SECRET = TEST_SECRET;
  const groupsStore = new InMemoryGroupsStore();
  const planningStore = new InMemoryPlanningStore();
  const votingStore = new InMemoryVotingStore();
  const app = await createApp({ groupsStore, planningStore, votingStore });

  const member = "notify-member";
  const outsider = "notify-outsider";
  const confirmed = await seedConfirmedEvent(
    groupsStore,
    planningStore,
    votingStore,
    member,
    [],
    "Friday tacos",
    "prop-notify-1",
  );
  await seedConfirmedEvent(
    groupsStore,
    planningStore,
    votingStore,
    outsider,
    [],
    "Secret brunch",
    "prop-notify-2",
  );
  await groupsStore.createGroup("No event yet", member);

  const memberRes = await app.inject({
    method: "GET",
    url: "/v1/me/notifications",
    headers: authHeaders(await signTestToken(member)),
  });
  assert.equal(memberRes.statusCode, 200);
  const memberBody = memberRes.json() as {
    notifications: Array<Record<string, unknown>>;
  };
  assert.equal(memberBody.notifications.length, 1);
  assert.deepEqual(memberBody.notifications[0], {
    type: "event_confirmed",
    groupId: confirmed.groupId,
    eventId: confirmed.eventId,
    summary: "Friday tacos",
    createdAt: confirmed.confirmedAt,
  });
  for (const item of memberBody.notifications) {
    for (const key of Object.keys(item)) {
      assert.ok(ALLOWED_KEYS.has(key), `unexpected field ${key}`);
    }
    assert.equal(item.prefs, undefined);
    assert.equal(item.preferences, undefined);
    assert.equal(item.availability, undefined);
    assert.equal(item.votes, undefined);
    assert.equal(item.choice, undefined);
  }

  const outsiderRes = await app.inject({
    method: "GET",
    url: "/v1/me/notifications",
    headers: authHeaders(await signTestToken(outsider)),
  });
  assert.equal(outsiderRes.statusCode, 200);
  const outsiderBody = outsiderRes.json() as {
    notifications: Array<{ eventId: string; summary: string }>;
  };
  assert.equal(outsiderBody.notifications.length, 1);
  assert.equal(outsiderBody.notifications[0]?.summary, "Secret brunch");
  assert.notEqual(outsiderBody.notifications[0]?.eventId, confirmed.eventId);

  const emptyRes = await app.inject({
    method: "GET",
    url: "/v1/me/notifications",
    headers: authHeaders(await signTestToken("nobody")),
  });
  assert.equal(emptyRes.statusCode, 200);
  assert.deepEqual(emptyRes.json(), { notifications: [] });

  await app.close();
});
