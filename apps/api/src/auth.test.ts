import assert from "node:assert/strict";
import { createSecretKey } from "node:crypto";
import test from "node:test";
import { SignJWT, createLocalJWKSet, exportJWK, generateKeyPair, type KeyLike } from "jose";
import { createApp } from "./app.js";
import { setJwksResolverForTests } from "./auth.js";
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
    async updateDisplayName(userId, displayName) {
      return { id: userId, profile: { displayName } };
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

test("PUT /v1/me without token returns 401", async () => {
  clearJwtClaimEnv();
  process.env.SUPABASE_JWT_SECRET = TEST_SECRET;
  const app = await createApp();
  const res = await app.inject({
    method: "PUT",
    url: "/v1/me",
    payload: { profile: { displayName: "Ada" } },
  });
  assert.equal(res.statusCode, 401);
  assert.deepEqual(res.json(), { error: "unauthorized" });
  await app.close();
});

test("PUT /v1/me with invalid body returns 400", async () => {
  clearJwtClaimEnv();
  process.env.SUPABASE_JWT_SECRET = TEST_SECRET;
  const token = await signTestToken("user-abc");
  const app = await createApp();
  const res = await app.inject({
    method: "PUT",
    url: "/v1/me",
    headers: { authorization: `Bearer ${token}` },
    payload: { displayName: "Ada" },
  });
  assert.equal(res.statusCode, 400);
  assert.deepEqual(res.json(), { error: "invalid_body" });
  await app.close();
});

test("PUT /v1/me persists displayName per JWT subject", async () => {
  clearJwtClaimEnv();
  process.env.SUPABASE_JWT_SECRET = TEST_SECRET;
  const ada = await signTestToken("user-abc");
  const other = await signTestToken("user-xyz");
  const store = new InMemoryProfileStore();
  const app = await createApp({ profileStore: store });

  const putAda = await app.inject({
    method: "PUT",
    url: "/v1/me",
    headers: { authorization: `Bearer ${ada}` },
    payload: { profile: { displayName: "Ada" } },
  });
  assert.equal(putAda.statusCode, 200);
  assert.deepEqual(putAda.json(), {
    id: "user-abc",
    profile: { displayName: "Ada" },
  });

  const getAda = await app.inject({
    method: "GET",
    url: "/v1/me",
    headers: { authorization: `Bearer ${ada}` },
  });
  assert.equal(getAda.statusCode, 200);
  assert.deepEqual(getAda.json(), {
    id: "user-abc",
    profile: { displayName: "Ada" },
  });

  const getOther = await app.inject({
    method: "GET",
    url: "/v1/me",
    headers: { authorization: `Bearer ${other}` },
  });
  assert.equal(getOther.statusCode, 200);
  assert.deepEqual(getOther.json(), {
    id: "user-xyz",
    profile: { displayName: null },
  });

  const clearAda = await app.inject({
    method: "PUT",
    url: "/v1/me",
    headers: { authorization: `Bearer ${ada}` },
    payload: { profile: { displayName: null } },
  });
  assert.equal(clearAda.statusCode, 200);
  assert.deepEqual(clearAda.json(), {
    id: "user-abc",
    profile: { displayName: null },
  });
  await app.close();
});

test("SupabaseProfileStore.updateDisplayName upserts profiles.display_name for sub", async () => {
  const calls: { table: string; row: unknown }[] = [];
  const client = {
    from(table: string) {
      return {
        upsert(row: unknown) {
          calls.push({ table, row });
          return {
            select() {
              return {
                async single() {
                  return {
                    data: { id: "user-abc", display_name: "Ada" },
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
  const store = new SupabaseProfileStore(client as never);
  const result = await store.updateDisplayName("user-abc", "Ada");
  assert.deepEqual(result, {
    id: "user-abc",
    profile: { displayName: "Ada" },
  });
  assert.deepEqual(calls, [
    {
      table: "profiles",
      row: { id: "user-abc", display_name: "Ada" },
    },
  ]);
});

async function signEs256Token(sub: string, privateKey: KeyLike, kid: string): Promise<string> {
  return new SignJWT({ role: "authenticated" })
    .setProtectedHeader({ alg: "ES256", kid })
    .setSubject(sub)
    .setIssuedAt()
    .setExpirationTime("2h")
    .sign(privateKey);
}

async function useEs256Jwks(kid: string): Promise<KeyLike> {
  const { publicKey, privateKey } = await generateKeyPair("ES256");
  const jwk = { ...(await exportJWK(publicKey)), kid, alg: "ES256", use: "sig" };
  setJwksResolverForTests(createLocalJWKSet({ keys: [jwk] }));
  return privateKey;
}

test("GET /v1/me accepts an ES256 token signed by a key in the project JWKS", async () => {
  clearJwtClaimEnv();
  process.env.SUPABASE_JWT_SECRET = TEST_SECRET;
  const privateKey = await useEs256Jwks("k1");
  const token = await signEs256Token("user-es256", privateKey, "k1");
  const app = await createApp();
  const res = await app.inject({ method: "GET", url: "/v1/me", headers: { authorization: `Bearer ${token}` } });
  assert.equal(res.statusCode, 200);
  assert.equal(res.json().id, "user-es256");
  await app.close();
  setJwksResolverForTests(undefined);
});

test("GET /v1/me rejects an ES256 token signed by a key that is not in the JWKS", async () => {
  clearJwtClaimEnv();
  process.env.SUPABASE_JWT_SECRET = TEST_SECRET;
  await useEs256Jwks("k1");
  const { privateKey: otherKey } = await generateKeyPair("ES256");
  const token = await signEs256Token("user-evil", otherKey, "k1");
  const app = await createApp();
  const res = await app.inject({ method: "GET", url: "/v1/me", headers: { authorization: `Bearer ${token}` } });
  assert.equal(res.statusCode, 401);
  await app.close();
  setJwksResolverForTests(undefined);
});

test("GET /v1/me rejects an ES256 token when no JWKS is configured", async () => {
  clearJwtClaimEnv();
  process.env.SUPABASE_JWT_SECRET = TEST_SECRET;
  const savedUrl = process.env.SUPABASE_URL;
  delete process.env.SUPABASE_URL;
  setJwksResolverForTests(undefined);
  const { privateKey } = await generateKeyPair("ES256");
  const token = await signEs256Token("user-x", privateKey, "k1");
  const app = await createApp();
  const res = await app.inject({ method: "GET", url: "/v1/me", headers: { authorization: `Bearer ${token}` } });
  assert.equal(res.statusCode, 401);
  await app.close();
  if (savedUrl !== undefined) process.env.SUPABASE_URL = savedUrl;
});

test("GET /v1/me rejects a token with an unsupported algorithm", async () => {
  clearJwtClaimEnv();
  process.env.SUPABASE_JWT_SECRET = TEST_SECRET;
  const key = createSecretKey(Buffer.from(TEST_SECRET, "utf8"));
  const token = await new SignJWT({}).setProtectedHeader({ alg: "HS512" }).setSubject("user-hs512").setExpirationTime("2h").sign(key);
  const app = await createApp();
  const res = await app.inject({ method: "GET", url: "/v1/me", headers: { authorization: `Bearer ${token}` } });
  assert.equal(res.statusCode, 401);
  await app.close();
});
