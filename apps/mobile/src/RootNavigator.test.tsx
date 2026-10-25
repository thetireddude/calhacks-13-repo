import { Linking } from "react-native";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import { AuthProvider, createMockAuthClient } from "./auth";
import type { AuthClient } from "./auth";
import { createMockGroupClient } from "./groups";
import { RootNavigator } from "./RootNavigator";

beforeEach(() => {
  jest.spyOn(Linking, "getInitialURL").mockResolvedValue(null);
  jest.spyOn(Linking, "addEventListener").mockReturnValue({ remove: () => {} });
});

async function renderApp(client: AuthClient = createMockAuthClient()) {
  await render(
    <AuthProvider client={client}>
      <RootNavigator groupClient={createMockGroupClient()} />
    </AuthProvider>,
  );
}

async function fill(email = "a@example.com", password = "secret1") {
  await fireEvent.changeText(await screen.findByLabelText("Email"), email);
  await fireEvent.changeText(screen.getByLabelText("Password"), password);
}

test("signed-out user sees the sign-in form and no authenticated screens", async () => {
  await renderApp();
  expect(await screen.findByLabelText("Email")).toBeTruthy();
  expect(screen.getByLabelText("Password").props.secureTextEntry).toBe(true);
  expect(screen.queryByText("Your groups")).toBeNull();
  expect(screen.queryByText("Sign out")).toBeNull();
});

test("an existing session skips the signed-out stack", async () => {
  const client = createMockAuthClient();
  await client.signIn("a@example.com", "secret1");
  await renderApp(client);
  expect(await screen.findByText("Your groups")).toBeTruthy();
  expect(screen.queryByLabelText("Email")).toBeNull();
});

test("sign in reaches authenticated tabs and logout returns to the form", async () => {
  const client = createMockAuthClient();
  await renderApp(client);
  await fill();
  await fireEvent.press(screen.getByText("Sign in"));
  await screen.findByText("Your groups");
  await fireEvent.press(screen.getByText("Sign out"));
  expect(await screen.findByLabelText("Email")).toBeTruthy();
  expect(screen.queryByText("Your groups")).toBeNull();
  await waitFor(async () => expect(await client.getSession()).toBeNull());
});

test("create account success reaches authenticated tabs", async () => {
  await renderApp();
  await fill();
  await fireEvent.press(screen.getByText("Create account"));
  await screen.findByText("Your groups");
});

test("wrong password shows an error, stays signed out, and a retry can succeed", async () => {
  const client = createMockAuthClient({ signIn: "invalid_credentials" });
  await renderApp(client);
  await fill();
  await fireEvent.press(screen.getByText("Sign in"));
  await screen.findByText("Incorrect email or password.");
  expect(screen.queryByText("Your groups")).toBeNull();
  client.setSignInOutcome("success");
  await fireEvent.changeText(screen.getByLabelText("Password"), "secret2");
  expect(screen.queryByText("Incorrect email or password.")).toBeNull();
  await fireEvent.press(screen.getByText("Sign in"));
  await screen.findByText("Your groups");
});

test.each([
  ["email_taken", /already exists/],
  ["weak_password", /too weak/],
  ["confirmation_required", /Turn off Confirm email/],
  ["network", /Network problem/],
] as const)("create account %s shows its own message and stays signed out", async (outcome, pattern) => {
  await renderApp(createMockAuthClient({ signUp: outcome }));
  await fill();
  await fireEvent.press(screen.getByText("Create account"));
  await screen.findByText(pattern);
  expect(screen.queryByText("Your groups")).toBeNull();
});

test("validation blocks empty or invalid input before calling the client", async () => {
  const client = createMockAuthClient();
  const signIn = jest.spyOn(client, "signIn");
  const signUp = jest.spyOn(client, "signUp");
  await renderApp(client);
  await fireEvent.press(await screen.findByText("Sign in"));
  await screen.findByText("Enter a valid email address.");
  await fill("not-an-email", "secret1");
  await fireEvent.press(screen.getByText("Create account"));
  await screen.findByText("Enter a valid email address.");
  await fill("a@example.com", "12345");
  await fireEvent.press(screen.getByText("Create account"));
  await screen.findByText("Password must be at least 6 characters.");
  expect(signIn).not.toHaveBeenCalled();
  expect(signUp).not.toHaveBeenCalled();
  expect(screen.queryByText("Your groups")).toBeNull();
});

test("sign in with a short existing password reaches the client; create account with it is blocked", async () => {
  const client = createMockAuthClient();
  const signIn = jest.spyOn(client, "signIn");
  const signUp = jest.spyOn(client, "signUp");
  await renderApp(client);
  await fill("a@example.com", "12345");
  await fireEvent.press(screen.getByText("Create account"));
  await screen.findByText("Password must be at least 6 characters.");
  expect(signUp).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByText("Sign in"));
  await screen.findByText("Your groups");
  expect(signIn).toHaveBeenCalledWith("a@example.com", "12345");
});

test("sign in requires a non-empty password", async () => {
  const client = createMockAuthClient();
  const signIn = jest.spyOn(client, "signIn");
  await renderApp(client);
  await fill("a@example.com", "");
  await fireEvent.press(screen.getByText("Sign in"));
  await screen.findByText("Enter your password.");
  expect(signIn).not.toHaveBeenCalled();
});

test("sign in with confirmation_required shows the confirmation message", async () => {
  await renderApp(createMockAuthClient({ signIn: "confirmation_required" }));
  await fill();
  await fireEvent.press(screen.getByText("Sign in"));
  await screen.findByText(/Turn off Confirm email/);
  expect(screen.queryByText("Your groups")).toBeNull();
});
