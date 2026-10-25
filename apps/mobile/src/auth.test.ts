import { AuthError, createMockAuthClient } from "./auth";

test("signIn and signUp success create a session and signOut clears it", async () => {
  const c = createMockAuthClient();
  expect(await c.signIn("a@example.com", "secret1")).toEqual({ kind: "mock" });
  expect(await c.getSession()).not.toBeNull();
  await c.signOut();
  expect(await c.getSession()).toBeNull();
  expect(await c.signUp("a@example.com", "secret1")).toEqual({ kind: "mock" });
  expect(await c.getSession()).not.toBeNull();
});

test.each(["invalid_credentials", "network"] as const)("signIn fixture %s rejects with that code and no session", async (o) => {
  const c = createMockAuthClient({ signIn: o });
  await expect(c.signIn("a@example.com", "secret1")).rejects.toMatchObject({ code: o });
  await expect(c.signIn("a@example.com", "secret1")).rejects.toBeInstanceOf(AuthError);
  expect(await c.getSession()).toBeNull();
});

test.each(["email_taken", "weak_password", "confirmation_required", "network"] as const)("signUp fixture %s rejects and can be reset", async (o) => {
  const c = createMockAuthClient({ signUp: o });
  await expect(c.signUp("a@example.com", "secret1")).rejects.toMatchObject({ code: o });
  expect(await c.getSession()).toBeNull();
  c.setSignUpOutcome("success");
  await expect(c.signUp("a@example.com", "secret1")).resolves.toEqual({ kind: "mock" });
});
