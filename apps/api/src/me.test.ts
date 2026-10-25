import assert from "node:assert/strict";
import { createSecretKey } from "node:crypto";
import test from "node:test";
import { SignJWT } from "jose";
import { createApp } from "./app.js";
import { InMemoryMemberSetupStore } from "./me/store.js";

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

const USER_A_PREFS = {
  activityTags: ["hiking", "user-a-only-tag"],
  budgetMin: 10,
  budgetMax: 50,
  travelRadiusKm: 25,
  learningOptIn: true,
};

const USER_B_PREFS = {
  activityTags: ["sushi", "user-b-secret-tag"],
  budgetMin: 100,
  budgetMax: 200,
  travelRadiusKm: 5,
  learningOptIn: false,
};

const USER_A_WINDOW = {
  startsAt: "2026-11-01T18:00:00.000Z",
  endsAt: "2026-11-01T21:00:00.000Z",
  label: "user-a-evening",
};

const USER_B_WINDOW = {
  startsAt: "2026-12-24T12:00:00.000Z",
  endsAt: "2026-12-24T15:00:00.000Z",
  label: "user-b-holiday-secret",
};

test("preferences and availability routes return 401 without JWT", async () => {
  process.env.SUPABASE_JWT_SECRET = TEST_SECRET;
  const app = await createApp({ memberSetupStore: new InMemoryMemberSetupStore() });
  const cases = [
    { method: "GET" as const, url: "/v1/me/preferences" },
    {
      method: "PUT" as const,
      url: "/v1/me/preferences",
      payload: USER_A_PREFS,
    },
    { method: "GET" as const, url: "/v1/me/availability" },
    {
      method: "PUT" as const,
      url: "/v1/me/availability",
      payload: { windows: [USER_A_WINDOW] },
    },
  ];
  for (const c of cases) {
    const res = await app.inject({ ...c });
    assert.equal(res.statusCode, 401, c.url);
  }
  await app.close();
});

test("GET preferences returns defaults; PUT round-trips camelCase fields", async () => {
  process.env.SUPABASE_JWT_SECRET = TEST_SECRET;
  const store = new InMemoryMemberSetupStore();
  const app = await createApp({ memberSetupStore: store });
  const token = await signTestToken("prefs-user-1");

  const initial = await app.inject({
    method: "GET",
    url: "/v1/me/preferences",
    headers: authHeaders(token),
  });
  assert.equal(initial.statusCode, 200);
  assert.deepEqual(initial.json(), {
    activityTags: [],
    budgetMin: null,
    budgetMax: null,
    travelRadiusKm: null,
    learningOptIn: false,
  });

  const putRes = await app.inject({
    method: "PUT",
    url: "/v1/me/preferences",
    headers: authHeaders(token),
    payload: USER_A_PREFS,
  });
  assert.equal(putRes.statusCode, 200);
  assert.deepEqual(putRes.json(), USER_A_PREFS);

  const getRes = await app.inject({
    method: "GET",
    url: "/v1/me/preferences",
    headers: authHeaders(token),
  });
  assert.equal(getRes.statusCode, 200);
  assert.deepEqual(getRes.json(), USER_A_PREFS);

  await app.close();
});

test("PUT availability replaces windows; GET returns stored set", async () => {
  process.env.SUPABASE_JWT_SECRET = TEST_SECRET;
  const app = await createApp({ memberSetupStore: new InMemoryMemberSetupStore() });
  const token = await signTestToken("avail-user-1");

  const empty = await app.inject({
    method: "GET",
    url: "/v1/me/availability",
    headers: authHeaders(token),
  });
  assert.equal(empty.statusCode, 200);
  assert.deepEqual(empty.json(), { windows: [] });

  const putRes = await app.inject({
    method: "PUT",
    url: "/v1/me/availability",
    headers: authHeaders(token),
    payload: { windows: [USER_A_WINDOW] },
  });
  assert.equal(putRes.statusCode, 200);
  assert.deepEqual(putRes.json(), { windows: [USER_A_WINDOW] });

  const replaceRes = await app.inject({
    method: "PUT",
    url: "/v1/me/availability",
    headers: authHeaders(token),
    payload: {
      windows: [
        {
          startsAt: "2026-11-02T10:00:00.000Z",
          endsAt: "2026-11-02T11:00:00.000Z",
        },
      ],
    },
  });
  assert.equal(replaceRes.statusCode, 200);
  const replaced = replaceRes.json() as { windows: unknown[] };
  assert.equal(replaced.windows.length, 1);
  assert.equal(
    (replaced.windows[0] as { label?: string }).label,
    undefined,
  );

  await app.close();
});

test("privacy: JWT subject scopes preferences and availability to the caller only", async () => {
  process.env.SUPABASE_JWT_SECRET = TEST_SECRET;
  const store = new InMemoryMemberSetupStore();
  const app = await createApp({ memberSetupStore: store });
  const tokenA = await signTestToken("privacy-user-a");
  const tokenB = await signTestToken("privacy-user-b");

  await app.inject({
    method: "PUT",
    url: "/v1/me/preferences",
    headers: authHeaders(tokenA),
    payload: USER_A_PREFS,
  });
  await app.inject({
    method: "PUT",
    url: "/v1/me/preferences",
    headers: authHeaders(tokenB),
    payload: USER_B_PREFS,
  });
  await app.inject({
    method: "PUT",
    url: "/v1/me/availability",
    headers: authHeaders(tokenA),
    payload: { windows: [USER_A_WINDOW] },
  });
  await app.inject({
    method: "PUT",
    url: "/v1/me/availability",
    headers: authHeaders(tokenB),
    payload: { windows: [USER_B_WINDOW] },
  });

  const prefsA = await app.inject({
    method: "GET",
    url: "/v1/me/preferences",
    headers: authHeaders(tokenA),
  });
  const prefsB = await app.inject({
    method: "GET",
    url: "/v1/me/preferences",
    headers: authHeaders(tokenB),
  });
  const availA = await app.inject({
    method: "GET",
    url: "/v1/me/availability",
    headers: authHeaders(tokenA),
  });
  const availB = await app.inject({
    method: "GET",
    url: "/v1/me/availability",
    headers: authHeaders(tokenB),
  });

  const bodyA = JSON.stringify({
    prefs: prefsA.json(),
    availability: availA.json(),
  });
  const bodyB = JSON.stringify({
    prefs: prefsB.json(),
    availability: availB.json(),
  });

  assert.ok(!bodyA.includes("user-b-secret-tag"));
  assert.ok(!bodyA.includes("user-b-holiday-secret"));
  assert.ok(!bodyB.includes("user-a-only-tag"));
  assert.ok(!bodyB.includes("user-a-evening"));

  assert.deepEqual(prefsA.json(), USER_A_PREFS);
  assert.deepEqual(prefsB.json(), USER_B_PREFS);
  assert.deepEqual(availA.json(), { windows: [USER_A_WINDOW] });
  assert.deepEqual(availB.json(), { windows: [USER_B_WINDOW] });

  await app.close();
});
