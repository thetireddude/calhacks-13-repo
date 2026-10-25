import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import { AuthProvider, createMockAuthClient } from "./auth";
import type { AuthClient } from "./auth";
import { RootNavigator } from "./RootNavigator";

async function renderApp(client: AuthClient = createMockAuthClient()) {
  await render(
    <AuthProvider client={client}>
      <RootNavigator />
    </AuthProvider>,
  );
}

async function signIn() {
  await fireEvent.changeText(await screen.findByLabelText("Email"), "a@example.com");
  await fireEvent.press(screen.getByText("Send code"));
  await fireEvent.changeText(await screen.findByLabelText("Code"), "123456");
  await fireEvent.press(screen.getByText("Verify"));
  await screen.findByText("Groups placeholder");
}

test("signed-out user sees the email screen and no authenticated screens", async () => {
  await renderApp();
  expect(await screen.findByLabelText("Email")).toBeTruthy();
  expect(screen.queryByText("Groups placeholder")).toBeNull();
  expect(screen.queryByText("Sign out")).toBeNull();
});

test("a failed verification does not reach authenticated screens", async () => {
  await renderApp();
  await fireEvent.changeText(await screen.findByLabelText("Email"), "a@example.com");
  await fireEvent.press(screen.getByText("Send code"));
  await fireEvent.changeText(await screen.findByLabelText("Code"), " ");
  await fireEvent.press(screen.getByText("Verify"));
  await screen.findByText("Enter the code.");
  expect(screen.queryByText("Groups placeholder")).toBeNull();
});

test("an existing session skips the signed-out stack", async () => {
  const client = createMockAuthClient();
  await client.verifyOtp("a@example.com", "123456");
  await renderApp(client);
  expect(await screen.findByText("Groups placeholder")).toBeTruthy();
  expect(screen.queryByLabelText("Email")).toBeNull();
});

test("sign-in reaches authenticated tabs and logout returns to the email screen", async () => {
  const client = createMockAuthClient();
  await renderApp(client);
  await signIn();
  await fireEvent.press(screen.getByText("Sign out"));
  expect(await screen.findByLabelText("Email")).toBeTruthy();
  expect(screen.queryByText("Groups placeholder")).toBeNull();
  await waitFor(async () => expect(await client.getSession()).toBeNull());
});
