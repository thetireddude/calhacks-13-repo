import { fireEvent, render, screen } from "@testing-library/react-native";
import { Linking } from "react-native";

import { AuthProvider, createMockAuthClient } from "./auth";
import { createMockGroupClient } from "./groups";
import type { GroupSchedule } from "@gather/contracts";
import {
  MemberSetupError,
  createMockMemberSetupClient,
  createMockNotificationPermissionClient,
} from "./memberSetup";
import type { MemberSetupClient, NotificationPermissionClient, ScheduleClient } from "./memberSetup";
import { RootNavigator } from "./RootNavigator";

async function renderSignedIn(opts: { member?: MemberSetupClient; notifications?: NotificationPermissionClient } = {}) {
  const auth = createMockAuthClient();
  await auth.signIn("a@example.com", "secret1");
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
  await screen.findByText("Saved: learning is off.");
  await fireEvent.changeText(screen.getByLabelText("Activity preferences"), "hiking, games");
  await fireEvent.changeText(screen.getByLabelText("Maximum budget"), "40");
  await fireEvent(screen.getByLabelText("Learn from my history"), "valueChange", true);
  await screen.findByText("Unsaved change.");
  expect(screen.getByText("Saved: learning is off.")).toBeTruthy();
  await fireEvent.press(screen.getByText("Save preferences"));
  await screen.findByText("Saved.");
  await screen.findByText("Saved: learning is on.");
  expect(screen.queryByText("Unsaved change.")).toBeNull();
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

test("privacy: setup screens render the owner's own data and nothing from other users", async () => {
  const member = createMockMemberSetupClient();
  await member.putPreferences({ activityTags: ["mine-tag"], budgetMin: null, budgetMax: null, travelRadiusKm: null, learningOptIn: false });
  await member.putAvailability({ windows: [{ startsAt: "2026-01-02T18:00", endsAt: "2026-01-02T20:00", label: "mine-window" }] });
  await renderSignedIn({ member });
  await fireEvent.press(screen.getByText("Activity preferences"));
  expect((await screen.findByLabelText("Activity preferences")).props.value).toBe("mine-tag");
  expect(screen.queryByText(/other-member/)).toBeNull();
  await fireEvent.press(screen.getByRole("button", { name: /Setup, tab/ }));
  await fireEvent.press(await screen.findByText("Availability"));
  await screen.findByText(/mine-window/);
  expect(screen.queryByText(/other-member/)).toBeNull();
});

function failingOnce(base: MemberSetupClient): { client: MemberSetupClient; puts: () => number } {
  let fail = true;
  let puts = 0;
  const gate = <T,>(f: () => Promise<T>) => async () => {
    if (fail) {
      fail = false;
      throw new Error("down");
    }
    return f();
  };
  return {
    puts: () => puts,
    client: {
      getPreferences: gate(() => base.getPreferences()),
      getAvailability: gate(() => base.getAvailability()),
      putPreferences: async (r) => { puts++; return base.putPreferences(r); },
      putAvailability: async (r) => { puts++; return base.putAvailability(r); },
    },
  };
}

test("preferences load failure hides Save, issues no PUT, and recovers on retry", async () => {
  const base = createMockMemberSetupClient();
  await base.putPreferences({ activityTags: ["kept"], budgetMin: null, budgetMax: null, travelRadiusKm: null, learningOptIn: true });
  const { client, puts } = failingOnce(base);
  await renderSignedIn({ member: client });
  await fireEvent.press(screen.getByText("Activity preferences"));
  await screen.findByText("Could not load. Please try again.");
  expect(screen.queryByText("Save preferences")).toBeNull();
  await fireEvent.press(screen.getByText("Retry"));
  await screen.findByText("Saved: learning is on.");
  expect(screen.getByText("Save preferences")).toBeTruthy();
  expect(puts()).toBe(0);
});

test("availability load failure hides Save, issues no PUT, and recovers on retry", async () => {
  const base = createMockMemberSetupClient();
  await base.putAvailability({ windows: [{ startsAt: "2026-01-02T18:00", endsAt: "2026-01-02T20:00" }] });
  const { client, puts } = failingOnce(base);
  await renderSignedIn({ member: client });
  await fireEvent.press(screen.getByText("Availability"));
  await screen.findByText("Could not load. Please try again.");
  expect(screen.queryByText("Save availability")).toBeNull();
  await fireEvent.press(screen.getByText("Retry"));
  await screen.findByText("2026-01-02T18:00 to 2026-01-02T20:00");
  expect(puts()).toBe(0);
});

async function openWeekly(schedule?: ScheduleClient) {
  const auth = createMockAuthClient();
  await auth.signIn("a@example.com", "secret1");
  await render(
    <AuthProvider client={auth}>
      <RootNavigator groupClient={createMockGroupClient()} scheduleClient={schedule} />
    </AuthProvider>,
  );
  await screen.findByText("Your groups");
  await fireEvent.press(screen.getByText("Create group"));
  await fireEvent.changeText(await screen.findByLabelText("Group name"), "Climbing");
  await fireEvent.press(screen.getByText("Create"));
  await screen.findByText("Climbing");
  await fireEvent.press(screen.getByRole("button", { name: /Setup, tab/ }));
  await fireEvent.press(await screen.findByText("Weekly planning: Climbing"));
}

test("weekly planning loads backend state, saves config only and says auto-planning is unavailable", async () => {
  const put = jest.fn(async (_id: string, s: GroupSchedule) => s);
  await openWeekly({ get: async () => ({ timezone: "Europe/Paris", weeklyEnabled: false }), put });
  expect((await screen.findByLabelText("Timezone")).props.value).toBe("Europe/Paris");
  expect(screen.getByText(/Automatic weekly planning is not available yet/)).toBeTruthy();
  await fireEvent.changeText(screen.getByLabelText("Timezone"), "America/Los_Angeles");
  await fireEvent(screen.getByLabelText("Weekly planning enabled"), "valueChange", true);
  await fireEvent.press(screen.getByText("Save weekly planning"));
  await screen.findByText("Saved.");
  expect(put).toHaveBeenCalledTimes(1);
  expect(put).toHaveBeenCalledWith(expect.any(String), { timezone: "America/Los_Angeles", weeklyEnabled: true });
});

test("weekly planning shows a server validation error and a generic save failure", async () => {
  const put = jest
    .fn<Promise<GroupSchedule>, [string, GroupSchedule]>()
    .mockRejectedValueOnce(new MemberSetupError("invalid"))
    .mockRejectedValueOnce(new MemberSetupError("network"));
  await openWeekly({ get: async () => ({ timezone: "UTC", weeklyEnabled: false }), put });
  await screen.findByLabelText("Timezone");
  await fireEvent.press(screen.getByText("Save weekly planning"));
  await screen.findByText(/The server rejected these settings/);
  await fireEvent.press(screen.getByText("Save weekly planning"));
  await screen.findByText("Could not save. Please try again.");
  expect(screen.queryByText("Saved.")).toBeNull();
});

test("weekly planning rejects blank and non-IANA timezones locally, accepts a valid zone", async () => {
  const put = jest.fn(async (_id: string, s: GroupSchedule) => s);
  await openWeekly({ get: async () => ({ timezone: "UTC", weeklyEnabled: false }), put });
  const field = await screen.findByLabelText("Timezone");
  await fireEvent.changeText(field, " ");
  await fireEvent.press(screen.getByText("Save weekly planning"));
  await screen.findByText("Enter a timezone such as America/Los_Angeles.");
  await fireEvent.changeText(field, "Pacific");
  await fireEvent.press(screen.getByText("Save weekly planning"));
  await screen.findByText("Enter a timezone such as America/Los_Angeles.");
  expect(put).not.toHaveBeenCalled();
  await fireEvent.changeText(field, "America/Los_Angeles");
  await fireEvent.press(screen.getByText("Save weekly planning"));
  await screen.findByText("Saved.");
  expect(put).toHaveBeenCalledTimes(1);
  expect(screen.queryByText("Enter a timezone such as America/Los_Angeles.")).toBeNull();
});

test("weekly planning shows clearer messages for 403 and 404", async () => {
  const put = jest
    .fn<Promise<GroupSchedule>, [string, GroupSchedule]>()
    .mockRejectedValueOnce(new MemberSetupError("forbidden"))
    .mockRejectedValueOnce(new MemberSetupError("not_found"));
  await openWeekly({ get: async () => ({ timezone: "UTC", weeklyEnabled: false }), put });
  await screen.findByLabelText("Timezone");
  await fireEvent.press(screen.getByText("Save weekly planning"));
  await screen.findByText("You do not have access to this group's settings.");
  await fireEvent.press(screen.getByText("Save weekly planning"));
  await screen.findByText("This group was not found.");
});

test("weekly planning load failure hides the form and Save", async () => {
  await openWeekly({ get: async () => { throw new MemberSetupError("server"); }, put: jest.fn() });
  await screen.findByText("Could not load. Please try again.");
  expect(screen.queryByText("Save weekly planning")).toBeNull();
});

test("weekly planning works against the in-memory default (mock mode)", async () => {
  await openWeekly();
  expect((await screen.findByLabelText("Timezone")).props.value).toBe("UTC");
  await fireEvent.press(screen.getByText("Save weekly planning"));
  await screen.findByText("Saved.");
});
