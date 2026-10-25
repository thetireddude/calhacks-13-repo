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

test("signIn calls signInWithPassword and returns a session with the access token", async () => {
  const signInWithPassword = jest.fn().mockResolvedValue({ data: { session: sess }, error: null });
  const c = createSupabaseAuthClient(fakeSupabase({ signInWithPassword }));
  expect(await c.signIn("a@example.com", "secret1")).toEqual({ kind: "supabase", accessToken: "tok-abc" });
  expect(signInWithPassword).toHaveBeenCalledWith({ email: "a@example.com", password: "secret1" });
});

test("signUp calls signUp and returns the immediate session", async () => {
  const signUp = jest.fn().mockResolvedValue({ data: { session: sess }, error: null });
  const c = createSupabaseAuthClient(fakeSupabase({ signUp }));
  expect(await c.signUp("a@example.com", "secret1")).toEqual({ kind: "supabase", accessToken: "tok-abc" });
  expect(signUp).toHaveBeenCalledWith({ email: "a@example.com", password: "secret1" });
});

test.each([
  [{ status: 400, code: "invalid_credentials", message: "secret-email@x.com secret1" }, "invalid_credentials"],
  [{ status: 422, code: "user_already_exists" }, "email_taken"],
  [{ status: 422, code: "email_exists" }, "email_taken"],
  [{ status: 422, code: "weak_password" }, "weak_password"],
  [{ status: 429, code: "over_request_rate_limit" }, "network"],
  [{ status: 0, name: "AuthRetryableFetchError" }, "network"],
  [{ status: 500 }, "network"],
  [{ status: undefined }, "network"],
])("signIn and signUp map %j to %s without leaking the SDK message", async (error, code) => {
  const result = jest.fn().mockResolvedValue({ data: { session: null }, error });
  const c = createSupabaseAuthClient(fakeSupabase({ signInWithPassword: result, signUp: result }));
  for (const err of [
    await c.signIn("a@example.com", "secret1").catch((e) => e),
    await c.signUp("a@example.com", "secret1").catch((e) => e),
  ]) {
    expect(err).toBeInstanceOf(AuthError);
    expect(err.code).toBe(code);
    expect(err.message).toBe(code);
    expect(`${err.message}${err.stack}`).not.toMatch(/a@example\.com|secret1|secret-email/);
  }
});

test("signUp without a session (email confirmation on) throws confirmation_required", async () => {
  const signUp = jest.fn().mockResolvedValue({ data: { session: null, user: { id: "u" } }, error: null });
  const err = await createSupabaseAuthClient(fakeSupabase({ signUp })).signUp("a@example.com", "secret1").catch((e) => e);
  expect(err).toMatchObject({ code: "confirmation_required" });
});

test("a thrown SDK/fetch error maps to network with no input or token in message or stack", async () => {
  const boom = jest.fn().mockRejectedValue(new Error("fail a@example.com secret1 tok-abc"));
  const c = createSupabaseAuthClient(fakeSupabase({ signInWithPassword: boom, signUp: boom }));
  for (const err of [await c.signIn("a@example.com", "secret1").catch((e) => e), await c.signUp("a@example.com", "secret1").catch((e) => e)]) {
    expect(err).toMatchObject({ code: "network" });
    expect(`${err.message}${err.stack}`).not.toMatch(/a@example\.com|secret1|tok-abc/);
  }
});

test("signIn with no session and no error is a network-type failure, not success", async () => {
  const none = createSupabaseAuthClient(fakeSupabase({ signInWithPassword: jest.fn().mockResolvedValue({ data: { session: null }, error: null }) }));
  await expect(none.signIn("a@example.com", "secret1")).rejects.toMatchObject({ code: "network" });
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

test("getAccessToken returns the current token, not a snapshot, and null on none/throw", async () => {
  const getSession = jest
    .fn()
    .mockResolvedValueOnce({ data: { session: { access_token: "old" } } })
    .mockResolvedValueOnce({ data: { session: { access_token: "refreshed" } } })
    .mockResolvedValueOnce({ data: { session: null } })
    .mockRejectedValueOnce(new Error("x"));
  const c = createSupabaseAuthClient(fakeSupabase({ getSession }));
  expect(await c.getAccessToken()).toBe("old");
  expect(await c.getAccessToken()).toBe("refreshed");
  expect(await c.getAccessToken()).toBeNull();
  expect(await c.getAccessToken()).toBeNull();
});

test.each([
  [1800, 1],
  [1801, 2],
  [3600, 2],
  [3601, 3],
])("secure storage %i chars uses %i chunk(s) and round-trips", async (len, chunks) => {
  const store = memoryStore();
  const s = createSecureSessionStorage(store);
  const v = Array.from({ length: len }, (_, i) => String.fromCharCode(97 + (i % 26))).join("");
  await s.setItem("k", v);
  expect(store.m.size).toBe(chunks + 1);
  expect(await s.getItem("k")).toBe(v);
  await s.setItem("k", "tiny");
  expect(store.m.size).toBe(2);
  expect(await s.getItem("k")).toBe("tiny");
});

test("secure storage returns null for corrupt count or missing chunk", async () => {
  const store = memoryStore();
  const s = createSecureSessionStorage(store);
  for (const bad of ["abc", "0", "-1", "1.5", ""]) {
    store.m.set("k.n", bad);
    expect(await s.getItem("k")).toBeNull();
  }
  store.m.set("k.n", "3");
  store.m.set("k.0", "a");
  store.m.set("k.1", "b");
  expect(await s.getItem("k")).toBeNull();
});

test("secure storage removeItem deletes everything it can even if one delete fails, then rethrows", async () => {
  const store = memoryStore();
  const s = createSecureSessionStorage(store);
  await s.setItem("k", "x".repeat(4000));
  const failing = { ...store, deleteItemAsync: async (k: string) => { if (k === "k.0") throw new Error("fail"); store.m.delete(k); } };
  await expect(createSecureSessionStorage(failing).removeItem("k")).rejects.toThrow("fail");
  expect([...store.m.keys()]).toEqual(["k.0"]);
});

test("secure storage setItem failure leaves no partial session and rethrows", async () => {
  const store = memoryStore();
  let calls = 0;
  const failing = { ...store, setItemAsync: async (k: string, v: string) => { if (++calls === 2) throw new Error("disk"); store.m.set(k, v); } };
  const s = createSecureSessionStorage(failing);
  await expect(s.setItem("k", "x".repeat(4000))).rejects.toThrow("disk");
  expect(store.m.size).toBe(0);
  expect(await s.getItem("k")).toBeNull();
});

const okJson = (body: unknown) => jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => body });

test("api client joins baseUrl with trailing slashes without doubling them", async () => {
  const fetchImpl = okJson({});
  await createApiClient({ baseUrl: "http://api.test//", getAccessToken: async () => null, fetchImpl }).getMe();
  expect(fetchImpl.mock.calls[0][0]).toBe("http://api.test/v1/me");
  expect(fetchImpl.mock.calls[0][1].headers.Authorization).toBeUndefined();
});

test("api client maps fetch failure and non-JSON 200 to a network ApiError with no token leak", async () => {
  const cases = [
    jest.fn().mockRejectedValue(new TypeError("Network request failed tok-abc")),
    jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => { throw new SyntaxError("Unexpected token tok-abc"); } }),
  ];
  for (const fetchImpl of cases) {
    const err = await createApiClient({ baseUrl: "http://api.test", getAccessToken: async () => "tok-abc", fetchImpl }).getMe().catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.network).toBe(true);
    expect(err.unauthorized).toBe(false);
    expect(`${err.message}${err.stack}`).not.toContain("tok-abc");
  }
});

test("api client treats 500 as a non-network, non-unauthorized error", async () => {
  const err = await createApiClient({ baseUrl: "http://api.test", getAccessToken: async () => "t", fetchImpl: jest.fn().mockResolvedValue({ ok: false, status: 500 }) }).getMe().catch((e) => e);
  expect(err).toMatchObject({ status: 500, network: false, unauthorized: false });
});
