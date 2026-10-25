import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { Linking, Share } from "react-native";

import { AuthProvider, createMockAuthClient } from "./auth";
import { MOCK_SEED_INVITE_TOKEN, createMockGroupClient, inviteLink } from "./groups";
import type { GroupClient } from "./groups";
import { RootNavigator } from "./RootNavigator";

async function renderSignedIn(groupClient: GroupClient = createMockGroupClient(), waitForList = true) {
  const auth = createMockAuthClient();
  await auth.verifyOtp("a@example.com", "123456");
  await render(
    <AuthProvider client={auth}>
      <RootNavigator groupClient={groupClient} />
    </AuthProvider>,
  );
  if (waitForList) await screen.findByText("Your groups");
}

async function createGroup(name: string) {
  await fireEvent.press(screen.getByText("Create group"));
  await fireEvent.changeText(await screen.findByLabelText("Group name"), name);
  await fireEvent.press(screen.getByText("Create"));
  await screen.findByText(name);
}

beforeEach(() => {
  jest.spyOn(Linking, "getInitialURL").mockResolvedValue(null);
  jest.spyOn(Linking, "addEventListener").mockReturnValue({ remove: () => {} });
});
afterEach(() => jest.restoreAllMocks());

test("create group opens its dashboard, which lists entry points and the member list", async () => {
  await renderSignedIn();
  await createGroup("Climbing");
  for (const t of ["Members", "Invite members", "Open planning", "View confirmed event", "Open notifications"])
    expect(screen.getByText(t)).toBeTruthy();
  await fireEvent.press(screen.getByText("Members"));
  expect(await screen.findByText("user-me")).toBeTruthy();
  expect(screen.getByText("Role: owner")).toBeTruthy();
});

test("blank group name shows an error and stays on the form", async () => {
  await renderSignedIn();
  await fireEvent.press(screen.getByText("Create group"));
  await fireEvent.press(await screen.findByText("Create"));
  await screen.findByText("Enter a group name.");
});

test("dashboard entry point navigates to the planning tab", async () => {
  await renderSignedIn();
  await createGroup("Climbing");
  await fireEvent.press(screen.getByText("Open planning"));
  await screen.findByText("Planning placeholder");
});

test("generated invite is shown as a token link and can be shared", async () => {
  const share = jest.spyOn(Share, "share").mockResolvedValue({ action: "sharedAction", activityType: undefined });
  await renderSignedIn();
  await createGroup("Climbing");
  await fireEvent.press(screen.getByText("Invite members"));
  await fireEvent.press(await screen.findByText("Generate invite link"));
  const link = await screen.findByText(/^gather:\/\/invite\//);
  await fireEvent.press(screen.getByText("Share invite"));
  expect(share).toHaveBeenCalledWith({ message: link.props.children });
});

test("join by pasted token adds the group, updates the list and members", async () => {
  await renderSignedIn();
  await fireEvent.changeText(screen.getByLabelText("Invite token"), MOCK_SEED_INVITE_TOKEN);
  await fireEvent.press(screen.getByText("Join group"));
  await screen.findByText("Seed Friends");
  await fireEvent.press(screen.getByText("Members"));
  expect(await screen.findByText("user-seed")).toBeTruthy();
  expect(screen.getByText("user-me")).toBeTruthy();
  expect(screen.getByText("Role: member")).toBeTruthy();
});

test("invalid invite token shows an error and joins nothing", async () => {
  await renderSignedIn();
  await fireEvent.changeText(screen.getByLabelText("Invite token"), "bogus");
  await fireEvent.press(screen.getByText("Join group"));
  await screen.findByText("That invite link is not valid.");
  expect(screen.getByText("No groups yet.")).toBeTruthy();
});

test("opening an invite deep link joins the group", async () => {
  jest.spyOn(Linking, "getInitialURL").mockResolvedValue(inviteLink(MOCK_SEED_INVITE_TOKEN));
  await renderSignedIn(undefined, false);
  await screen.findByText("Seed Friends");
});

test("a link received while running joins the group; a non-invite link is ignored", async () => {
  const listeners: ((e: { url: string }) => void)[] = [];
  jest.spyOn(Linking, "addEventListener").mockImplementation((_t, l) => {
    listeners.push(l as (e: { url: string }) => void);
    return { remove: () => {} };
  });
  const listener = (e: { url: string }) => listeners.forEach((l) => l(e));
  await renderSignedIn();
  await act(async () => listener({ url: "https://example.com/x" }));
  expect(screen.getByText("No groups yet.")).toBeTruthy();
  await act(async () => listener({ url: inviteLink(MOCK_SEED_INVITE_TOKEN) }));
  await screen.findByText("Seed Friends");
});

test("multiple groups are kept in navigation state and listed together", async () => {
  await renderSignedIn();
  await createGroup("Alpha");
  // The list screen stays mounted (hidden) under the dashboard in the stack.
  const hidden = { includeHiddenElements: true };
  await fireEvent.press(screen.getByText("Create group", hidden));
  await fireEvent.changeText(await screen.findByLabelText("Group name"), "Beta");
  await fireEvent.press(screen.getByText("Create"));
  await screen.findByText("Beta");
  expect(screen.getAllByText("Alpha", hidden).length).toBeGreaterThan(0);
  expect(screen.getAllByText("Beta", hidden).length).toBeGreaterThan(1);
  expect(screen.queryByText("No groups yet.", hidden)).toBeNull();
});

test("privacy: rendered group screens never show availability or preference data", async () => {
  await renderSignedIn();
  await fireEvent.changeText(screen.getByLabelText("Invite token"), MOCK_SEED_INVITE_TOKEN);
  await fireEvent.press(screen.getByText("Join group"));
  await fireEvent.press(await screen.findByText("Members"));
  await screen.findByText("user-seed");
  expect(JSON.stringify(screen.toJSON())).not.toMatch(/availab|preference|schedule|budget|calendar/i);
});
