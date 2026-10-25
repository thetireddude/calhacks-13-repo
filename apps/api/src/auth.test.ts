import assert from "node:assert/strict";
import { createSecretKey } from "node:crypto";
import test from "node:test";
import { SignJWT } from "jose";
import { createApp } from "./app.js";
import { createDefaultProfileStore } from "./me/createProfileStore.js";
import { InMemoryProfileStore, type ProfileStore } from "./me/profileStore.js";
import { SupabaseProfileStore } from "./me/supabaseProfileStore.js";

const TEST_SECRET = "dev-test-jwt-secret-at-least-32-chars!!";

async function signTestToken(
  sub: string,
  opts?: { issuer?: string; audience?: string },
): Promise<string> {
  const key = createSecretKey(Buffer.from(TEST_SECRET, "utf8"));
  let jwt = new SignJWT({ role: "authenticated" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(sub)
    .setIssuedAt()
    .setExpirationTime("2h");
  if (opts?.issuer) {
    jwt = jwt.setIssuer(opts.issuer);
  }
  if (opts?.audience) {
    jwt = jwt.setAudience(opts.audience);
  }
  return jwt.sign(key);
}

function clearJwtClaimEnv(): void {
  delete process.env.SUPABASE_JWT_ISSUER;
  delete process.env.SUPABASE_JWT_AUDIENCE;
}

test("GET /v1/me without token returns 401", async () => {
  clearJwtClaimEnv();
  process.env.SUPABASE_JWT_SECRET = TEST_SECRET;
  const app = await createApp();
  const res = await app.inject({ method: "GET", url: "/v1/me" });
  assert.equal(res.statusCode, 401);
  assert.deepEqual(res.json(), { error: "unauthorized" });
  await app.close();
});

test("GET /v1/me with invalid token returns 401", async () => {
  clearJwtClaimEnv();
  process.env.SUPABASE_JWT_SECRET = TEST_SECRET;
  const app = await createApp();
  const res = await app.inject({
    method: "GET",
    url: "/v1/me",
    headers: { authorization: "Bearer not-a-valid-jwt" },
  });
  assert.equal(res.statusCode, 401);
  assert.deepEqual(res.json(), { error: "unauthorized" });
  await app.close();
});

test("GET /v1/me with valid token returns user id", async () => {
  clearJwtClaimEnv();
  process.env.SUPABASE_JWT_SECRET = TEST_SECRET;
  const token = await signTestToken("user-abc");
  const app = await createApp();
  const res = await app.inject({
    method: "GET",
    url: "/v1/me",
    headers: { authorization: `Bearer ${token}` },
  });
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.json(), {
    id: "user-abc",
    profile: { displayName: null },
  });
  await app.close();
});

test("GET /v1/me rejects token with wrong issuer when SUPABASE_JWT_ISSUER is set", async () => {
  clearJwtClaimEnv();
  process.env.SUPABASE_JWT_SECRET = TEST_SECRET;
  process.env.SUPABASE_JWT_ISSUER = "https://example.supabase.co/auth/v1";
  const token = await signTestToken("user-abc", {
    issuer: "https://wrong.supabase.co/auth/v1",
  });
  const app = await createApp();
  const res = await app.inject({
    method: "GET",
    url: "/v1/me",
    headers: { authorization: `Bearer ${token}` },
  });
  assert.equal(res.statusCode, 401);
  assert.deepEqual(res.json(), { error: "unauthorized" });
  await app.close();
});

test("GET /v1/me accepts token matching configured issuer and audience", async () => {
  clearJwtClaimEnv();
  process.env.SUPABASE_JWT_SECRET = TEST_SECRET;
  process.env.SUPABASE_JWT_ISSUER = "https://example.supabase.co/auth/v1";
  process.env.SUPABASE_JWT_AUDIENCE = "authenticated";
  const token = await signTestToken("user-abc", {
    issuer: "https://example.supabase.co/auth/v1",
    audience: "authenticated",
  });
  const app = await createApp();
  const res = await app.inject({
    method: "GET",
    url: "/v1/me",
    headers: { authorization: `Bearer ${token}` },
  });
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.json(), {
    id: "user-abc",
    profile: { displayName: null },
  });
  await app.close();
});

test("GET /v1/me returns displayName from the authenticated user's profile store", async () => {
  clearJwtClaimEnv();
  process.env.SUPABASE_JWT_SECRET = TEST_SECRET;
  const token = await signTestToken("user-abc");
  const profileStore: ProfileStore = {
    async getOrCreateProfile(userId) {
      return {
        id: userId,
        profile: { displayName: userId === "user-abc" ? "Ada" : "other" },
      };
    },
  };
  const app = await createApp({ profileStore });
  const res = await app.inject({
    method: "GET",
    url: "/v1/me",
    headers: { authorization: `Bearer ${token}` },
  });
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.json(), {
    id: "user-abc",
    profile: { displayName: "Ada" },
  });
  await app.close();
});

test("createDefaultProfileStore uses in-memory when supabase env is unset", () => {
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  assert.ok(createDefaultProfileStore() instanceof InMemoryProfileStore);
});

test("createDefaultProfileStore uses supabase when env is set", () => {
  process.env.SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";
  try {
    assert.ok(createDefaultProfileStore() instanceof SupabaseProfileStore);
  } finally {
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  }
});
