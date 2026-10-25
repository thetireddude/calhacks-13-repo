import { fireEvent, render, screen } from "@testing-library/react-native";
import { Linking } from "react-native";

import { AuthProvider, createMockAuthClient } from "./auth";
import { createMockGroupClient } from "./groups";
import { createMockMemberSetupClient, createMockNotificationPermissionClient } from "./memberSetup";
import type { MemberSetupClient, NotificationPermissionClient } from "./memberSetup";
import { RootNavigator } from "./RootNavigator";

async function renderSignedIn(opts: { member?: MemberSetupClient; notifications?: NotificationPermissionClient } = {}) {
  const auth = createMockAuthClient();
  await auth.verifyOtp("a@example.com", "123456");
  await render(
    <AuthProvider client={auth}>
      <RootNavigator
        groupClient={createMockGroupClient()}
        memberSetupClient={opts.member}
        notificationClient={opts.notifications}
      />
    </AuthProvider>,
  );
  await screen.findByText("Your groups");
  await fireEvent.press(screen.getByRole("button", { name: /Setup, tab/ }));
  await screen.findByText("Your setup");
}

beforeEach(() => {
  jest.spyOn(Linking, "getInitialURL").mockResolvedValue(null);
  jest.spyOn(Linking, "addEventListener").mockReturnValue({ remove: () => {} });
});
afterEach(() => jest.restoreAllMocks());

test("denied push permission shows a fallback notice and setup stays usable", async () => {
  await renderSignedIn({ notifications: createMockNotificationPermissionClient("denied") });
  await fireEvent.press(screen.getByText("Allow notifications"));
  await screen.findByText(/Notifications are off/);
  await fireEvent.press(screen.getByText("Activity preferences"));
  await screen.findByText("Save preferences");
});

test("a throwing permission request is treated as denied", async () => {
  await renderSignedIn({ notifications: { request: async () => { throw new Error("boom"); } } });
  await fireEvent.press(screen.getByText("Allow notifications"));
  await screen.findByText(/Notifications are off/);
});

test("preferences save, reload, and learning toggle is shown accurately", async () => {
  const member = createMockMemberSetupClient();
  await renderSignedIn({ member });
  await fireEvent.press(screen.getByText("Activity preferences"));
  await screen.findByText("Learning is off.");
  await fireEvent.changeText(screen.getByLabelText("Activity preferences"), "hiking, games");
  await fireEvent.changeText(screen.getByLabelText("Maximum budget"), "40");
  await fireEvent(screen.getByLabelText("Learning opt-in"), "valueChange", true);
  await screen.findByText("Learning is on.");
  await fireEvent.press(screen.getByText("Save preferences"));
  await screen.findByText("Saved.");
  expect(await member.getPreferences()).toEqual({
    activityTags: ["hiking", "games"],
    budgetMin: null,
    budgetMax: 40,
    travelRadiusKm: null,
    learningOptIn: true,
  });
});

test("invalid budget shows an error and saves nothing", async () => {
  const member = createMockMemberSetupClient();
  await renderSignedIn({ member });
  await fireEvent.press(screen.getByText("Activity preferences"));
  await screen.findByText("Save preferences");
  await fireEvent.changeText(screen.getByLabelText("Minimum budget"), "50");
  await fireEvent.changeText(screen.getByLabelText("Maximum budget"), "10");
  await fireEvent.press(screen.getByText("Save preferences"));
  await screen.findByText("Minimum budget cannot be higher than maximum budget.");
  expect((await member.getPreferences()).budgetMax).toBeNull();
});

test("availability editor adds, validates, and saves only the owner's windows", async () => {
  const member = createMockMemberSetupClient();
  await renderSignedIn({ member });
  await fireEvent.press(screen.getByText("Availability"));
  await screen.findByText("No windows yet.");
  await fireEvent.changeText(screen.getByLabelText("Window start"), "2026-01-02T20:00");
  await fireEvent.changeText(screen.getByLabelText("Window end"), "2026-01-02T18:00");
  await fireEvent.press(screen.getByText("Add window"));
  await screen.findByText("End must be after start.");
  await fireEvent.changeText(screen.getByLabelText("Window end"), "2026-01-02T22:00");
  await fireEvent.press(screen.getByText("Add window"));
  await screen.findByText("2026-01-02T20:00 to 2026-01-02T22:00");
  await fireEvent.press(screen.getByText("Save availability"));
  await screen.findByText("Saved.");
  expect(await member.getAvailability()).toEqual({
    windows: [{ startsAt: "2026-01-02T20:00", endsAt: "2026-01-02T22:00" }],
  });
});

test("privacy: setup screens render only the signed-in user's own saved data", async () => {
  const member = createMockMemberSetupClient();
  await member.putPreferences({ activityTags: ["mine"], budgetMin: null, budgetMax: null, travelRadiusKm: null, learningOptIn: false });
  await renderSignedIn({ member });
  expect(screen.queryByText(/user-seed/)).toBeNull();
  await fireEvent.press(screen.getByText("Availability"));
  await screen.findByText("No windows yet.");
  expect(screen.queryByText(/user-seed/)).toBeNull();
});

test("weekly planning draft validates and saves per group", async () => {
  await renderSignedIn();
  await fireEvent.press(screen.getByRole("button", { name: /Groups, tab/ }));
  await fireEvent.press(await screen.findByText("Create group"));
  await fireEvent.changeText(await screen.findByLabelText("Group name"), "Climbing");
  await fireEvent.press(screen.getByText("Create"));
  await screen.findByText("Climbing");
  await fireEvent.press(screen.getByRole("button", { name: /Setup, tab/ }));
  await fireEvent.press(await screen.findByText("Weekly planning: Climbing"));
  await fireEvent.changeText(await screen.findByLabelText("Weekday"), "9");
  await fireEvent.press(screen.getByText("Save weekly planning"));
  await screen.findByText(/Weekday must be/);
  await fireEvent.changeText(screen.getByLabelText("Weekday"), "5");
  await fireEvent.changeText(screen.getByLabelText("Planning time"), "18:00");
  await fireEvent.changeText(screen.getByLabelText("Voting deadline hours"), "24");
  await fireEvent.press(screen.getByText("Save weekly planning"));
  await screen.findByText("Saved.");
});
