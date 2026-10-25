import assert from "node:assert/strict";
import { createSecretKey } from "node:crypto";
import test from "node:test";
import { SignJWT } from "jose";
import { createApp } from "./app.js";
import { DEFAULT_GROUP_SCHEDULE, InMemoryGroupsStore } from "./groups/store.js";
import { SupabaseGroupsStore } from "./groups/supabaseStore.js";

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
    {
      method: "GET" as const,
      url: "/v1/groups/00000000-0000-4000-8000-000000000001/schedule",
    },
    {
      method: "PUT" as const,
      url: "/v1/groups/00000000-0000-4000-8000-000000000001/schedule",
      payload: { timezone: "UTC", weeklyEnabled: false },
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

test("GET/PUT /v1/groups/:groupId/schedule is config-only with defaults", async () => {
  process.env.SUPABASE_JWT_SECRET = TEST_SECRET;
  const store = new InMemoryGroupsStore();
  const app = await createApp({ groupsStore: store });
  const ownerToken = await signTestToken("owner-s");
  const outsiderToken = await signTestToken("outsider-s");

  const missing = await app.inject({
    method: "GET",
    url: "/v1/groups/00000000-0000-4000-8000-000000000099/schedule",
    headers: authHeaders(ownerToken),
  });
  assert.equal(missing.statusCode, 404);

  const createRes = await app.inject({
    method: "POST",
    url: "/v1/groups",
    headers: authHeaders(ownerToken),
    payload: { name: "Schedule crew" },
  });
  const groupId = (createRes.json() as { id: string }).id;

  const defaultRes = await app.inject({
    method: "GET",
    url: `/v1/groups/${groupId}/schedule`,
    headers: authHeaders(ownerToken),
  });
  assert.equal(defaultRes.statusCode, 200);
  assert.deepEqual(defaultRes.json(), DEFAULT_GROUP_SCHEDULE);

  const forbidden = await app.inject({
    method: "PUT",
    url: `/v1/groups/${groupId}/schedule`,
    headers: authHeaders(outsiderToken),
    payload: { timezone: "America/Los_Angeles", weeklyEnabled: true },
  });
  assert.equal(forbidden.statusCode, 403);

  const invalid = await app.inject({
    method: "PUT",
    url: `/v1/groups/${groupId}/schedule`,
    headers: authHeaders(ownerToken),
    payload: { timezone: "  ", weeklyEnabled: true },
  });
  assert.equal(invalid.statusCode, 400);
  assert.deepEqual(invalid.json(), { error: "invalid_schedule" });

  const putRes = await app.inject({
    method: "PUT",
    url: `/v1/groups/${groupId}/schedule`,
    headers: authHeaders(ownerToken),
    payload: { timezone: " America/Los_Angeles ", weeklyEnabled: true },
  });
  assert.equal(putRes.statusCode, 200);
  assert.deepEqual(putRes.json(), {
    timezone: "America/Los_Angeles",
    weeklyEnabled: true,
  });

  const getRes = await app.inject({
    method: "GET",
    url: `/v1/groups/${groupId}/schedule`,
    headers: authHeaders(ownerToken),
  });
  assert.equal(getRes.statusCode, 200);
  assert.deepEqual(getRes.json(), {
    timezone: "America/Los_Angeles",
    weeklyEnabled: true,
  });

  await app.close();
});

test("SupabaseGroupsStore getSchedule defaults and putSchedule upserts", async () => {
  const upserts: unknown[] = [];
  const client = {
    from(table: string) {
      if (table !== "group_schedules") {
        throw new Error(`unexpected table ${table}`);
      }
      return {
        select() {
          return {
            eq() {
              return {
                async maybeSingle() {
                  return { data: null, error: null };
                },
              };
            },
          };
        },
        upsert(row: unknown) {
          upserts.push(row);
          return {
            select() {
              return {
                async single() {
                  return {
                    data: {
                      timezone: "America/New_York",
                      weekly_enabled: true,
                    },
                    error: null,
                  };
                },
              };
            },
          };
        },
      };
    },
  };
  const store = new SupabaseGroupsStore(client as never);
  assert.deepEqual(await store.getSchedule("g1"), DEFAULT_GROUP_SCHEDULE);
  assert.deepEqual(
    await store.putSchedule("g1", {
      timezone: "America/New_York",
      weeklyEnabled: true,
    }),
    { timezone: "America/New_York", weeklyEnabled: true },
  );
  assert.deepEqual(upserts, [
    {
      group_id: "g1",
      timezone: "America/New_York",
      weekly_enabled: true,
    },
  ]);
});
