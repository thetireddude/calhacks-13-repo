import assert from "node:assert/strict";
import { createSecretKey } from "node:crypto";
import test from "node:test";
import { SignJWT } from "jose";
import { createApp } from "./app.js";
import { InMemoryGroupsStore } from "./groups/store.js";

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

test("group routes return 401 without JWT", async () => {
  process.env.SUPABASE_JWT_SECRET = TEST_SECRET;
  const app = await createApp({ groupsStore: new InMemoryGroupsStore() });
  const cases = [
    { method: "POST" as const, url: "/v1/groups", payload: { name: "G" } },
    { method: "GET" as const, url: "/v1/groups" },
    { method: "GET" as const, url: "/v1/groups/00000000-0000-4000-8000-000000000001" },
    {
      method: "POST" as const,
      url: "/v1/groups/00000000-0000-4000-8000-000000000001/invites",
    },
    { method: "POST" as const, url: "/v1/invites/some-token/join" },
    {
      method: "GET" as const,
      url: "/v1/groups/00000000-0000-4000-8000-000000000001/members",
    },
  ];
  for (const c of cases) {
    const res = await app.inject({ ...c });
    assert.equal(res.statusCode, 401, c.url);
  }
  await app.close();
});

test("POST /v1/groups creates group; non-member GET returns 403", async () => {
  process.env.SUPABASE_JWT_SECRET = TEST_SECRET;
  const store = new InMemoryGroupsStore();
  const app = await createApp({ groupsStore: store });
  const ownerToken = await signTestToken("owner-1");
  const outsiderToken = await signTestToken("outsider-1");

  const createRes = await app.inject({
    method: "POST",
    url: "/v1/groups",
    headers: authHeaders(ownerToken),
    payload: { name: "Weekend crew" },
  });
  assert.equal(createRes.statusCode, 201);
  const group = createRes.json() as { id: string; name: string; createdBy: string };
  assert.equal(group.name, "Weekend crew");
  assert.equal(group.createdBy, "owner-1");

  const forbidden = await app.inject({
    method: "GET",
    url: `/v1/groups/${group.id}`,
    headers: authHeaders(outsiderToken),
  });
  assert.equal(forbidden.statusCode, 403);
  assert.deepEqual(forbidden.json(), { error: "forbidden" });

  const ok = await app.inject({
    method: "GET",
    url: `/v1/groups/${group.id}`,
    headers: authHeaders(ownerToken),
  });
  assert.equal(ok.statusCode, 200);
  assert.equal((ok.json() as { id: string }).id, group.id);

  await app.close();
});

test("GET /v1/groups lists only groups the JWT subject belongs to", async () => {
  process.env.SUPABASE_JWT_SECRET = TEST_SECRET;
  const store = new InMemoryGroupsStore();
  const app = await createApp({ groupsStore: store });
  const ownerToken = await signTestToken("owner-1");
  const outsiderToken = await signTestToken("outsider-1");
  const joinerToken = await signTestToken("joiner-1");

  const emptyRes = await app.inject({
    method: "GET",
    url: "/v1/groups",
    headers: authHeaders(ownerToken),
  });
  assert.equal(emptyRes.statusCode, 200);
  assert.deepEqual(emptyRes.json(), { groups: [] });

  const first = await app.inject({
    method: "POST",
    url: "/v1/groups",
    headers: authHeaders(ownerToken),
    payload: { name: "Alpha" },
  });
  const second = await app.inject({
    method: "POST",
    url: "/v1/groups",
    headers: authHeaders(ownerToken),
    payload: { name: "Beta" },
  });
  const other = await app.inject({
    method: "POST",
    url: "/v1/groups",
    headers: authHeaders(outsiderToken),
    payload: { name: "Gamma" },
  });
  assert.equal(first.statusCode, 201);
  assert.equal(second.statusCode, 201);
  assert.equal(other.statusCode, 201);
  const firstId = (first.json() as { id: string }).id;
  const secondId = (second.json() as { id: string }).id;
  const otherId = (other.json() as { id: string }).id;

  const inviteRes = await app.inject({
    method: "POST",
    url: `/v1/groups/${firstId}/invites`,
    headers: authHeaders(ownerToken),
  });
  const token = (inviteRes.json() as { token: string }).token;
  const joinRes = await app.inject({
    method: "POST",
    url: `/v1/invites/${token}/join`,
    headers: authHeaders(joinerToken),
  });
  assert.equal(joinRes.statusCode, 200);

  const ownerList = await app.inject({
    method: "GET",
    url: "/v1/groups",
    headers: authHeaders(ownerToken),
  });
  assert.equal(ownerList.statusCode, 200);
  const ownerGroups = (
    ownerList.json() as { groups: { id: string; name: string }[] }
  ).groups;
  assert.deepEqual(
    ownerGroups.map((g) => g.id).sort(),
    [firstId, secondId].sort(),
  );
  assert.ok(!ownerGroups.some((g) => g.id === otherId));

  const outsiderList = await app.inject({
    method: "GET",
    url: "/v1/groups",
    headers: authHeaders(outsiderToken),
  });
  assert.equal(outsiderList.statusCode, 200);
  assert.deepEqual(
    (outsiderList.json() as { groups: { id: string }[] }).groups.map((g) => g.id),
    [otherId],
  );

  const joinerList = await app.inject({
    method: "GET",
    url: "/v1/groups",
    headers: authHeaders(joinerToken),
  });
  assert.equal(joinerList.statusCode, 200);
  const joinerGroups = (joinerList.json() as { groups: { id: string }[] }).groups;
  assert.deepEqual(
    joinerGroups.map((g) => g.id),
    [firstId],
  );

  await app.close();
});

test("invite, join, and list members flow", async () => {
  process.env.SUPABASE_JWT_SECRET = TEST_SECRET;
  const store = new InMemoryGroupsStore();
  const app = await createApp({ groupsStore: store });
  const ownerToken = await signTestToken("owner-a");
  const joinerToken = await signTestToken("joiner-b");

  const createRes = await app.inject({
    method: "POST",
    url: "/v1/groups",
    headers: authHeaders(ownerToken),
    payload: { name: "Dinner club" },
  });
  const groupId = (createRes.json() as { id: string }).id;

  const inviteRes = await app.inject({
    method: "POST",
    url: `/v1/groups/${groupId}/invites`,
    headers: authHeaders(ownerToken),
  });
  assert.equal(inviteRes.statusCode, 201);
  const token = (inviteRes.json() as { token: string }).token;
  assert.ok(token.length > 8);

  const joinRes = await app.inject({
    method: "POST",
    url: `/v1/invites/${token}/join`,
    headers: authHeaders(joinerToken),
  });
  assert.equal(joinRes.statusCode, 200);
  const joined = joinRes.json() as { groupId: string; userId: string };
  assert.equal(joined.groupId, groupId);
  assert.equal(joined.userId, "joiner-b");

  const membersRes = await app.inject({
    method: "GET",
    url: `/v1/groups/${groupId}/members`,
    headers: authHeaders(ownerToken),
  });
  assert.equal(membersRes.statusCode, 200);
  const members = (membersRes.json() as { members: { userId: string }[] })
    .members;
  assert.equal(members.length, 2);
  const userIds = members.map((m) => m.userId).sort();
  assert.deepEqual(userIds, ["joiner-b", "owner-a"]);

  await app.close();
});
