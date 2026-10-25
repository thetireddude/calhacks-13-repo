import {
  createMockMemberSetupClient,
  createMockScheduleClient,
  validatePreferences,
  validateWindow,
} from "./memberSetup";

test("preferences round-trip and learning opt-out persists", async () => {
  const c = createMockMemberSetupClient();
  const req = { activityTags: ["hiking"], budgetMin: 10, budgetMax: 50, travelRadiusKm: 20, learningOptIn: true };
  expect(await c.putPreferences(req)).toEqual(req);
  expect(await c.getPreferences()).toEqual(req);
  await c.putPreferences({ ...req, learningOptIn: false });
  expect((await c.getPreferences()).learningOptIn).toBe(false);
});

test("availability round-trips and returns copies", async () => {
  const c = createMockMemberSetupClient();
  const windows = [{ startsAt: "2026-01-02T18:00", endsAt: "2026-01-02T20:00", label: "Evening" }];
  await c.putAvailability({ windows });
  const got = await c.getAvailability();
  expect(got).toEqual({ windows });
  got.windows[0].label = "changed";
  expect((await c.getAvailability()).windows[0].label).toBe("Evening");
});

test("preferences validation", () => {
  const f = { tags: " a, b ,a,", budgetMin: "", budgetMax: "40", radius: "" };
  expect(validatePreferences(f, true)).toEqual({
    ok: true,
    value: { activityTags: ["a", "b"], budgetMin: null, budgetMax: 40, travelRadiusKm: null, learningOptIn: true },
  });
  expect(validatePreferences({ ...f, budgetMin: "50" }, false).ok).toBe(false);
  expect(validatePreferences({ ...f, budgetMax: "x" }, false).ok).toBe(false);
  expect(validatePreferences({ ...f, radius: "-1" }, false).ok).toBe(false);
});

test("window validation", () => {
  expect(validateWindow("2026-01-02T18:00", "2026-01-02T20:00")).toBeNull();
  expect(validateWindow("nope", "2026-01-02T20:00")).not.toBeNull();
  expect(validateWindow("2026-01-02T20:00", "2026-01-02T18:00")).not.toBeNull();
});

test("mock schedule client defaults to the backend defaults and round-trips per group", async () => {
  const s = createMockScheduleClient();
  expect(await s.get("g1")).toEqual({ timezone: "UTC", weeklyEnabled: false });
  await s.put("g1", { timezone: "America/Los_Angeles", weeklyEnabled: true });
  expect(await s.get("g1")).toEqual({ timezone: "America/Los_Angeles", weeklyEnabled: true });
  expect(await s.get("g2")).toEqual({ timezone: "UTC", weeklyEnabled: false });
});
