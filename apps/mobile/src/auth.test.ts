import { AuthError, createMockAuthClient } from "./auth";

test("success creates a session and signOut clears it", async () => {
  const c = createMockAuthClient();
  await c.requestOtp("a@example.com");
  expect(await c.verifyOtp("a@example.com", "123456")).toEqual({ kind: "mock" });
  expect(await c.getSession()).not.toBeNull();
  await c.signOut();
  expect(await c.getSession()).toBeNull();
});

test.each(["invalid_code", "expired_code", "network"] as const)("verify fixture %s rejects with that code and no session", async (o) => {
  const c = createMockAuthClient({ verify: o });
  await expect(c.verifyOtp("a@example.com", "123456")).rejects.toMatchObject({ code: o });
  await expect(c.verifyOtp("a@example.com", "123456")).rejects.toBeInstanceOf(AuthError);
  expect(await c.getSession()).toBeNull();
});

test("request network fixture rejects and can be reset", async () => {
  const c = createMockAuthClient({ request: "network" });
  await expect(c.requestOtp("a@example.com")).rejects.toMatchObject({ code: "network" });
  c.setRequestOutcome("success");
  await expect(c.requestOtp("a@example.com")).resolves.toBeUndefined();
});
