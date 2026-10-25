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

async function signIn() {
  await fireEvent.changeText(await screen.findByLabelText("Email"), "a@example.com");
  await fireEvent.press(screen.getByText("Send code"));
  await fireEvent.changeText(await screen.findByLabelText("Code"), "123456");
  await fireEvent.press(screen.getByText("Verify"));
  await screen.findByText("Your groups");
}

test("signed-out user sees the email screen and no authenticated screens", async () => {
  await renderApp();
  expect(await screen.findByLabelText("Email")).toBeTruthy();
  expect(screen.queryByText("Your groups")).toBeNull();
  expect(screen.queryByText("Sign out")).toBeNull();
});

test("a failed verification does not reach authenticated screens", async () => {
  await renderApp();
  await fireEvent.changeText(await screen.findByLabelText("Email"), "a@example.com");
  await fireEvent.press(screen.getByText("Send code"));
  await fireEvent.changeText(await screen.findByLabelText("Code"), " ");
  await fireEvent.press(screen.getByText("Verify"));
  await screen.findByText("Enter the code.");
  expect(screen.queryByText("Your groups")).toBeNull();
});

test("an existing session skips the signed-out stack", async () => {
  const client = createMockAuthClient();
  await client.verifyOtp("a@example.com", "123456");
  await renderApp(client);
  expect(await screen.findByText("Your groups")).toBeTruthy();
  expect(screen.queryByLabelText("Email")).toBeNull();
});

test("sign-in reaches authenticated tabs and logout returns to the email screen", async () => {
  const client = createMockAuthClient();
  await renderApp(client);
  await signIn();
  await fireEvent.press(screen.getByText("Sign out"));
  expect(await screen.findByLabelText("Email")).toBeTruthy();
  expect(screen.queryByText("Your groups")).toBeNull();
  await waitFor(async () => expect(await client.getSession()).toBeNull());
});

async function toOtp(client: AuthClient) {
  await renderApp(client);
  await fireEvent.changeText(await screen.findByLabelText("Email"), "a@example.com");
  await fireEvent.press(screen.getByText("Send code"));
  await screen.findByLabelText("Code");
}

test("invalid code shows its own error, clears on retry, and a retry can succeed", async () => {
  const client = createMockAuthClient({ verify: "invalid_code" });
  await toOtp(client);
  await fireEvent.changeText(screen.getByLabelText("Code"), "111111");
  await fireEvent.press(screen.getByText("Verify"));
  await screen.findByText(/not correct/);
  expect(screen.queryByText(/expired/)).toBeNull();
  client.setVerifyOutcome("success");
  await fireEvent.changeText(screen.getByLabelText("Code"), "222222");
  expect(screen.queryByText(/not correct/)).toBeNull();
  await fireEvent.press(screen.getByText("Verify"));
  await screen.findByText("Your groups");
});

test("expired code shows a distinct error and resend recovers", async () => {
  const client = createMockAuthClient({ verify: "expired_code" });
  await toOtp(client);
  await fireEvent.changeText(screen.getByLabelText("Code"), "111111");
  await fireEvent.press(screen.getByText("Verify"));
  await screen.findByText(/expired/);
  expect(screen.queryByText(/not correct/)).toBeNull();
  client.setVerifyOutcome("success");
  await fireEvent.press(screen.getByText("Resend code"));
  await screen.findByText("A new code was sent.");
  expect(screen.queryByText(/expired/)).toBeNull();
  await fireEvent.changeText(screen.getByLabelText("Code"), "333333");
  await fireEvent.press(screen.getByText("Verify"));
  await screen.findByText("Your groups");
});

test("network failure on verify is recoverable", async () => {
  const client = createMockAuthClient({ verify: "network" });
  await toOtp(client);
  await fireEvent.changeText(screen.getByLabelText("Code"), "111111");
  await fireEvent.press(screen.getByText("Verify"));
  await screen.findByText(/Network problem/);
  client.setVerifyOutcome("success");
  await fireEvent.press(screen.getByText("Verify"));
  await screen.findByText("Your groups");
});

test("requestOtp failure on the email screen shows an error and stays retryable", async () => {
  const client = createMockAuthClient({ request: "network" });
  await renderApp(client);
  await fireEvent.changeText(await screen.findByLabelText("Email"), "a@example.com");
  await fireEvent.press(screen.getByText("Send code"));
  await screen.findByText(/Network problem/);
  expect(screen.queryByLabelText("Code")).toBeNull();
  client.setRequestOutcome("success");
  await fireEvent.press(screen.getByText("Send code"));
  expect(await screen.findByLabelText("Code")).toBeTruthy();
});

test("invalid email is rejected before requesting a code", async () => {
  await renderApp();
  await fireEvent.changeText(await screen.findByLabelText("Email"), "not-an-email");
  await fireEvent.press(screen.getByText("Send code"));
  await screen.findByText("Enter a valid email address.");
  expect(screen.queryByLabelText("Code")).toBeNull();
});
