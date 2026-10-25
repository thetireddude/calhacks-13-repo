import assert from "node:assert/strict";
import { createSecretKey } from "node:crypto";
import test from "node:test";
import { SignJWT } from "jose";
import { createApp } from "./app.js";

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

test("GET /v1/me without token returns 401", async () => {
  process.env.SUPABASE_JWT_SECRET = TEST_SECRET;
  const app = await createApp();
  const res = await app.inject({ method: "GET", url: "/v1/me" });
  assert.equal(res.statusCode, 401);
  assert.deepEqual(res.json(), { error: "unauthorized" });
  await app.close();
});

test("GET /v1/me with invalid token returns 401", async () => {
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
  process.env.SUPABASE_JWT_SECRET = TEST_SECRET;
  const token = await signTestToken("user-abc");
  const app = await createApp();
  const res = await app.inject({
    method: "GET",
    url: "/v1/me",
    headers: { authorization: `Bearer ${token}` },
  });
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.json(), { id: "user-abc" });
  await app.close();
});
