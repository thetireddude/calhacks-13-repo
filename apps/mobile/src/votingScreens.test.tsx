import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { Linking } from "react-native";

import { AuthProvider, createMockAuthClient } from "./auth";
import { createMockGroupClient } from "./groups";
import { createMockNotificationPermissionClient } from "./memberSetup";
import { createMockPlanningClient } from "./planning";
import { RootNavigator } from "./RootNavigator";
import { FIXTURE_DEADLINE, createMockIcsClient, createMockVotingClient } from "./voting";
import type { IcsClient, MockVotingOptions, VotingClient } from "./voting";

async function setup(options: MockVotingOptions | VotingClient = {}, ics?: IcsClient) {
  const voting = "getVoteState" in options ? options : createMockVotingClient(options);
  const auth = createMockAuthClient();
  await auth.signIn("a@example.com", "secret1");
  await render(
    <AuthProvider client={auth}>
      <RootNavigator
        groupClient={createMockGroupClient()}
        planningClient={createMockPlanningClient("three")}
        notificationClient={createMockNotificationPermissionClient("denied")}
        votingClient={voting}
        icsClient={ics ?? createMockIcsClient()}
      />
    </AuthProvider>,
  );
  await screen.findByText("Your groups");
  await fireEvent.press(screen.getByText("Create group"));
  await fireEvent.changeText(await screen.findByLabelText("Group name"), "Climbing");
  await fireEvent.press(screen.getByText("Create"));
  return voting;
}

async function openProposals() {
  await fireEvent.press(await screen.findByText("Open planning"));
  await screen.findByText("Plan an activity");
  await fireEvent.press(screen.getByText("Start planning"));
  await screen.findByText("#1 Option 1: Saturday hike");
}

const openTab = (name: string) => fireEvent.press(screen.getByLabelText(new RegExp(`^${name}, tab`)));

beforeEach(() => {
  jest.spyOn(Linking, "getInitialURL").mockResolvedValue(null);
  jest.spyOn(Linking, "addEventListener").mockReturnValue({ remove: () => {} });
});
afterEach(() => jest.restoreAllMocks());

test("open voting shows deadline, aggregate counts, vote and separate veto controls", async () => {
  await setup({ vote: "open" });
  await openProposals();
  await screen.findAllByText(`Voting closes: ${FIXTURE_DEADLINE}`);
  expect(screen.getAllByText("Interested: 3 | Can't make it: 1")).toHaveLength(3);
  expect(screen.getByTestId("vote-approve-proposal-1")).toBeTruthy();
  expect(screen.getByTestId("veto-proposal-1")).toBeTruthy();
  expect(screen.queryByTestId("vote-banner-proposal-1")).toBeNull();
  expect(screen.getByTestId("vote-suggest-proposal-1").props.accessibilityState?.disabled).toBe(true);
});

test("veto control is hidden when the backend does not allow it", async () => {
  await setup({ vote: "noVeto" });
  await openProposals();
  await screen.findByTestId("vote-approve-proposal-1");
  expect(screen.queryByTestId("veto-proposal-1")).toBeNull();
});

test("veto and Can't make it are distinct controls that make distinct client calls", async () => {
  const base = createMockVotingClient({ vote: "open" });
  const putVote = jest.fn(base.putVote);
  const veto = jest.fn(base.veto);
  await setup({ ...base, putVote, veto });
  await openProposals();
  expect(screen.getByTestId("veto-proposal-1")).not.toBe(screen.getByTestId("vote-cant-make-it-proposal-1"));
  expect(screen.getAllByText("Veto this proposal").length).toBeGreaterThan(0);
  expect(screen.getAllByText("Can't make it").length).toBeGreaterThan(0);

  await fireEvent.press(await screen.findByTestId("vote-cant-make-it-proposal-1"));
  await screen.findByText("Your vote: Can't make it");
  expect(putVote).toHaveBeenCalledWith("proposal-1", { choice: "cant_make_it" });
  expect(veto).not.toHaveBeenCalled();

  await fireEvent.press(screen.getByTestId("veto-proposal-1"));
  expect(veto).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByTestId("veto-confirm-proposal-1"));
  await waitFor(() => expect(veto).toHaveBeenCalledWith("proposal-1"));
  expect(putVote).toHaveBeenCalledTimes(1);

  // Cancel backs out without a veto call.
  await fireEvent.press(screen.getByTestId("veto-proposal-1"));
  await fireEvent.press(screen.getByTestId("veto-cancel-proposal-1"));
  expect(veto).toHaveBeenCalledTimes(1);
});

test("Interested sends the approve choice only", async () => {
  const base = createMockVotingClient();
  const putVote = jest.fn(base.putVote);
  await setup({ ...base, putVote });
  await openProposals();
  await fireEvent.press(await screen.findByTestId("vote-approve-proposal-2"));
  await screen.findByText("Your vote: Interested");
  expect(putVote).toHaveBeenCalledWith("proposal-2", { choice: "approve" });
});

test.each([
  ["vetoed", "This proposal was vetoed.", false],
  ["revision", "This proposal was revised.", false],
  ["revote", "Revote: please vote again.", true],
  ["confirmed", "This plan is confirmed.", false],
  ["cancelled", "This plan was cancelled.", false],
] as const)("%s state renders its banner (voting controls: %s)", async (vote, banner, controls) => {
  await setup({ vote });
  await openProposals();
  await screen.findAllByText(banner);
  expect(screen.queryByTestId("vote-approve-proposal-1") !== null).toBe(controls);
  if (!controls) expect(screen.queryByTestId("veto-proposal-1")).toBeNull();
});

test("confirmed event shows summary and exports ICS through the IcsClient", async () => {
  const exportIcs = jest.fn(createMockIcsClient().exportIcs);
  await setup({ event: "confirmed" }, { exportIcs });
  await openTab("Events");
  await screen.findByText("Saturday hike at the ridge");
  await fireEvent.press(screen.getByText("Add to calendar (.ics)"));
  await screen.findByText("Calendar export is not connected yet (stub).");
  expect(exportIcs).toHaveBeenCalledWith("event-1");
});

test("a member who voted Can't make it can still open the confirmed event", async () => {
  await setup({ vote: "open", event: "confirmed" });
  await openProposals();
  await fireEvent.press(await screen.findByTestId("vote-cant-make-it-proposal-1"));
  await screen.findByText("Your vote: Can't make it");
  await openTab("Events");
  await screen.findByText("Saturday hike at the ridge");
  expect(screen.getByText("Add to calendar (.ics)")).toBeTruthy();
});

test("vote note is absent when counts are present", async () => {
  await setup({ vote: "open" });
  await openProposals();
  await screen.findAllByText(`Voting closes: ${FIXTURE_DEADLINE}`);
  expect(screen.queryByText("Vote counts are not available yet.")).toBeNull();
});

test("cancelled event shows cancellation and no calendar export", async () => {
  await setup({ event: "cancelled" });
  await openTab("Events");
  await screen.findByText("This event was cancelled.");
  expect(screen.queryByText("Add to calendar (.ics)")).toBeNull();
});

test("no confirmed event shows a neutral message", async () => {
  await setup({ event: "none" });
  await openTab("Events");
  await screen.findByText("No confirmed event yet.");
});

test("notification feed renders with push permission denied and no registration", async () => {
  await setup();
  await openTab("Notifications");
  await screen.findByText("New proposals");
  expect(screen.getByText("Event confirmed")).toBeTruthy();
});

test("empty notification feed shows a neutral message", async () => {
  await setup({ notifications: [] });
  await openTab("Notifications");
  await screen.findByText("No notifications yet.");
});

test("only aggregate counts are rendered: no per-member votes or private data", async () => {
  await setup({ vote: "open" });
  await openProposals();
  await screen.findAllByText("Interested: 3 | Can't make it: 1");
  expect(screen.queryByText(/user-me|availability|preference/i)).toBeNull();
  expect(screen.queryByText(/voted (for|approve)/i)).toBeNull();
});
