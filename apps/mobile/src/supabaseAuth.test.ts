import type { SupabaseClient } from "@supabase/supabase-js";

import { AuthError } from "./auth";
import { createSupabaseAuthClient } from "./supabaseAuth";
import { createSecureSessionStorage } from "./secureSessionStorage";
import { ApiError, createApiClient } from "./apiClient";

jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

function fakeSupabase(auth: Record<string, jest.Mock>) {
  return { auth } as unknown as SupabaseClient;
}
const sess = { access_token: "tok-abc" };

test("requestOtp calls signInWithOtp with the email", async () => {
  const signInWithOtp = jest.fn().mockResolvedValue({ error: null });
  await createSupabaseAuthClient(fakeSupabase({ signInWithOtp })).requestOtp("a@example.com");
  expect(signInWithOtp).toHaveBeenCalledWith({ email: "a@example.com" });
});

test("requestOtp maps SDK error and thrown fetch failure to network", async () => {
  const a = createSupabaseAuthClient(fakeSupabase({ signInWithOtp: jest.fn().mockResolvedValue({ error: { status: 429 } }) }));
  await expect(a.requestOtp("a@example.com")).rejects.toMatchObject({ code: "network" });
  const b = createSupabaseAuthClient(fakeSupabase({ signInWithOtp: jest.fn().mockRejectedValue(new Error("boom")) }));
  await expect(b.requestOtp("a@example.com")).rejects.toBeInstanceOf(AuthError);
});

test("verifyOtp success returns a session with the access token", async () => {
  const verifyOtp = jest.fn().mockResolvedValue({ data: { session: sess }, error: null });
  const c = createSupabaseAuthClient(fakeSupabase({ verifyOtp }));
  expect(await c.verifyOtp("a@example.com", " 123456 ")).toEqual({ kind: "supabase", accessToken: "tok-abc" });
  expect(verifyOtp).toHaveBeenCalledWith({ email: "a@example.com", token: "123456", type: "email" });
});

test.each([
  [{ status: 403, code: "otp_expired", message: "secret-email@x.com" }, "expired_code"],
  [{ status: 400, code: "validation_failed" }, "invalid_code"],
  [{ status: 0, name: "AuthRetryableFetchError" }, "network"],
  [{ status: 500 }, "network"],
])("verifyOtp maps %j to %s without leaking the SDK message", async (error, code) => {
  const c = createSupabaseAuthClient(fakeSupabase({ verifyOtp: jest.fn().mockResolvedValue({ data: { session: null }, error }) }));
  const err = await c.verifyOtp("a@example.com", "123456").catch((e) => e);
  expect(err).toBeInstanceOf(AuthError);
  expect(err.code).toBe(code);
  expect(err.message).toBe(code);
});

test("verifyOtp with no session or a thrown error rejects", async () => {
  const none = createSupabaseAuthClient(fakeSupabase({ verifyOtp: jest.fn().mockResolvedValue({ data: { session: null }, error: null }) }));
  await expect(none.verifyOtp("a@example.com", "1")).rejects.toMatchObject({ code: "invalid_code" });
  const thrown = createSupabaseAuthClient(fakeSupabase({ verifyOtp: jest.fn().mockRejectedValue(new Error("x")) }));
  await expect(thrown.verifyOtp("a@example.com", "1")).rejects.toMatchObject({ code: "network" });
});

test("getSession restores the SDK session and signOut delegates", async () => {
  const signOut = jest.fn().mockResolvedValue({ error: null });
  const getSession = jest.fn().mockResolvedValueOnce({ data: { session: sess } }).mockResolvedValueOnce({ data: { session: null } });
  const c = createSupabaseAuthClient(fakeSupabase({ getSession, signOut }));
  expect(await c.getSession()).toEqual({ kind: "supabase", accessToken: "tok-abc" });
  await c.signOut();
  expect(signOut).toHaveBeenCalled();
  expect(await c.getSession()).toBeNull();
});

function memoryStore() {
  const m = new Map<string, string>();
  return {
    m,
    getItemAsync: async (k: string) => m.get(k) ?? null,
    setItemAsync: async (k: string, v: string) => void m.set(k, v),
    deleteItemAsync: async (k: string) => void m.delete(k),
  };
}

test("secure storage round-trips a large value in chunks and removeItem clears all", async () => {
  const store = memoryStore();
  const s = createSecureSessionStorage(store);
  const big = "x".repeat(5000) + "end";
  await s.setItem("sb-auth-token", big);
  expect([...store.m.values()].every((v) => v.length <= 1800)).toBe(true);
  expect(await s.getItem("sb-auth-token")).toBe(big);
  await s.setItem("sb-auth-token", "small");
  expect(await s.getItem("sb-auth-token")).toBe("small");
  expect(store.m.size).toBe(2);
  await s.removeItem("sb-auth-token");
  expect(store.m.size).toBe(0);
  expect(await s.getItem("sb-auth-token")).toBeNull();
});

test("api client attaches the bearer header and parses /v1/me", async () => {
  const fetchImpl = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ id: "u1", profile: { displayName: null } }) });
  const api = createApiClient({ baseUrl: "http://api.test/", getAccessToken: async () => "tok-abc", fetchImpl });
  expect(await api.getMe()).toEqual({ id: "u1", profile: { displayName: null } });
  expect(fetchImpl).toHaveBeenCalledWith("http://api.test/v1/me", expect.objectContaining({ method: "GET", headers: expect.objectContaining({ Authorization: "Bearer tok-abc" }) }));
});

test("api client surfaces 401 distinctly and never puts the token in the error", async () => {
  const fetchImpl = jest.fn().mockResolvedValue({ ok: false, status: 401, json: async () => ({ error: "unauthorized" }) });
  const api = createApiClient({ baseUrl: "http://api.test", getAccessToken: async () => "tok-abc", fetchImpl });
  const err = await api.getMe().catch((e) => e);
  expect(err).toBeInstanceOf(ApiError);
  expect(err.unauthorized).toBe(true);
  expect(err.message).not.toContain("tok-abc");
  const other = createApiClient({ baseUrl: "http://api.test", getAccessToken: async () => null, fetchImpl: jest.fn().mockResolvedValue({ ok: false, status: 500 }) });
  const e2 = await other.getMe().catch((e) => e);
  expect(e2.unauthorized).toBe(false);
  expect(fetchImpl.mock.calls[0][1].headers.Authorization).toBe("Bearer tok-abc");
});
