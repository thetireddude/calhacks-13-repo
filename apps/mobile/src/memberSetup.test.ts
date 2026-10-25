import {
  createMockMemberSetupClient,
  createMockLocalScheduleClient,
  validatePreferences,
  validateWeeklySettings,
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

test("weekly settings validation and local mock round-trip", async () => {
  expect(validateWeeklySettings("7", "18:00", "24").ok).toBe(false);
  expect(validateWeeklySettings("3", "6pm", "24").ok).toBe(false);
  expect(validateWeeklySettings("3", "18:00", "0").ok).toBe(false);
  const r = validateWeeklySettings("3", "18:00", "24");
  if (!r.ok) throw new Error("expected ok");
  const s = createMockLocalScheduleClient();
  expect(await s.get("g1")).toBeNull();
  await s.put("g1", r.value);
  expect(await s.get("g1")).toEqual(r.value);
  expect(await s.get("g2")).toBeNull();
});
