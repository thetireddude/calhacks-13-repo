import type {
  AvailabilityWindow,
  MemberAvailabilityResponse,
  MemberPreferencesResponse,
  PutMemberAvailabilityRequest,
  PutMemberPreferencesRequest,
} from "@gather/contracts";

// Boundary the real API client will implement (SPEC section 6.2):
//   GET/PUT /v1/me/preferences, GET/PUT /v1/me/availability.
// Both are private to the signed-in user; there is no way to read another member's data.
export interface MemberSetupClient {
  getPreferences(): Promise<MemberPreferencesResponse>;
  putPreferences(req: PutMemberPreferencesRequest): Promise<MemberPreferencesResponse>;
  getAvailability(): Promise<MemberAvailabilityResponse>;
  putAvailability(req: PutMemberAvailabilityRequest): Promise<MemberAvailabilityResponse>;
}

// In-memory mock. Defaults are placeholders, not approved product defaults. Nothing is logged.
export function createMockMemberSetupClient(): MemberSetupClient {
  let preferences: MemberPreferencesResponse = {
    activityTags: [],
    budgetMin: null,
    budgetMax: null,
    travelRadiusKm: null,
    learningOptIn: false,
  };
  let windows: AvailabilityWindow[] = [];
  return {
    getPreferences: async () => ({ ...preferences, activityTags: [...preferences.activityTags] }),
    putPreferences: async (req) => {
      preferences = { ...req, activityTags: [...req.activityTags] };
      return { ...preferences, activityTags: [...preferences.activityTags] };
    },
    getAvailability: async () => ({ windows: windows.map((w) => ({ ...w })) }),
    putAvailability: async (req) => {
      windows = req.windows.map((w) => ({ ...w }));
      return { windows: windows.map((w) => ({ ...w })) };
    },
  };
}

// ---- Form validation (client-side shape checks only; no product rules) ----

export type PreferencesForm = {
  tags: string;
  budgetMin: string;
  budgetMax: string;
  radius: string;
};

function parseOptionalNumber(text: string): number | null | "invalid" {
  const t = text.trim();
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? n : "invalid";
}

export function parseTags(text: string): string[] {
  const seen = new Set<string>();
  for (const part of text.split(",")) {
    const tag = part.trim();
    if (tag !== "") seen.add(tag);
  }
  return [...seen];
}

export function validatePreferences(
  form: PreferencesForm,
  learningOptIn: boolean,
): { ok: true; value: PutMemberPreferencesRequest } | { ok: false; error: string } {
  const budgetMin = parseOptionalNumber(form.budgetMin);
  const budgetMax = parseOptionalNumber(form.budgetMax);
  const radius = parseOptionalNumber(form.radius);
  if (budgetMin === "invalid" || budgetMax === "invalid") return { ok: false, error: "Budget must be a number of 0 or more." };
  if (budgetMin !== null && budgetMax !== null && budgetMin > budgetMax)
    return { ok: false, error: "Minimum budget cannot be higher than maximum budget." };
  if (radius === "invalid") return { ok: false, error: "Travel radius must be a number of 0 or more." };
  return {
    ok: true,
    value: { activityTags: parseTags(form.tags), budgetMin, budgetMax, travelRadiusKm: radius, learningOptIn },
  };
}

// Window strings are typed `string` in the contract; their format is not frozen. The editor only
// requires that both parse as dates and that the window ends after it starts.
export function validateWindow(startsAt: string, endsAt: string): string | null {
  const start = Date.parse(startsAt.trim());
  const end = Date.parse(endsAt.trim());
  if (Number.isNaN(start) || Number.isNaN(end)) return "Enter start and end as dates, for example 2026-01-02T18:00.";
  if (end <= start) return "End must be after start.";
  return null;
}

// ---- Weekly planning settings: MOBILE-LOCAL, UNAPPROVED ----
// No schedule DTO exists in packages/contracts, and timezone/time/deadline representation are
// SPEC section 11 items. This shape and mock are placeholders so the UI can be built; they must be
// replaced by the contract once a SPEC section 9 change is approved. Do not treat as a frozen format.
export type LocalWeeklySettings = {
  weekday: number; // 0 = Sunday .. 6 = Saturday (unapproved)
  time: string; // "HH:MM" (unapproved; no timezone)
  votingDeadlineHours: number; // hours after planning run (unapproved)
};

export interface LocalScheduleClient {
  get(groupId: string): Promise<LocalWeeklySettings | null>;
  put(groupId: string, settings: LocalWeeklySettings): Promise<LocalWeeklySettings>;
}

export function createMockLocalScheduleClient(): LocalScheduleClient {
  const store = new Map<string, LocalWeeklySettings>();
  return {
    get: async (id) => {
      const s = store.get(id);
      return s ? { ...s } : null;
    },
    put: async (id, s) => {
      store.set(id, { ...s });
      return { ...s };
    },
  };
}

export function validateWeeklySettings(
  weekday: string,
  time: string,
  deadline: string,
): { ok: true; value: LocalWeeklySettings } | { ok: false; error: string } {
  const day = Number(weekday.trim());
  if (weekday.trim() === "" || !Number.isInteger(day) || day < 0 || day > 6)
    return { ok: false, error: "Weekday must be a number from 0 (Sunday) to 6 (Saturday)." };
  const t = time.trim();
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(t)) return { ok: false, error: "Time must look like 18:30." };
  const hours = Number(deadline.trim());
  if (deadline.trim() === "" || !Number.isInteger(hours) || hours <= 0)
    return { ok: false, error: "Voting deadline must be a whole number of hours above 0." };
  return { ok: true, value: { weekday: day, time: t, votingDeadlineHours: hours } };
}

// ---- Notification permission ----
export type NotificationPermissionResult = "granted" | "denied";
export interface NotificationPermissionClient {
  request(): Promise<NotificationPermissionResult>;
}

// Used by tests and as the default; the Expo-backed client is in notifications.ts.
export function createMockNotificationPermissionClient(
  result: NotificationPermissionResult = "denied",
): NotificationPermissionClient {
  return { request: async () => result };
}
