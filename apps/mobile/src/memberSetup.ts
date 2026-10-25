import type {
  AvailabilityWindow,
  GroupSchedule,
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

// Mobile-local error shape for the real client (contract error schema not frozen, SPEC section 11).
// unauthenticated = 401 (sign in again); invalid = 400 body rejected; network/server are retry types.
export type MemberSetupErrorCode = "unauthenticated" | "invalid" | "network" | "server";
export class MemberSetupError extends Error {
  constructor(readonly code: MemberSetupErrorCode) {
    super(code);
    this.name = "MemberSetupError";
  }
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

// ---- Weekly planning settings (contract GroupSchedule) ----
// Config only: the backend stores it and does not auto-plan from it (SPEC section 11). Defaults when a
// group has none are the backend's: UTC, disabled.
export interface ScheduleClient {
  get(groupId: string): Promise<GroupSchedule>;
  put(groupId: string, schedule: GroupSchedule): Promise<GroupSchedule>;
}

export function createMockScheduleClient(): ScheduleClient {
  const store = new Map<string, GroupSchedule>();
  return {
    get: async (id) => ({ ...(store.get(id) ?? { timezone: "UTC", weeklyEnabled: false }) }),
    put: async (id, s) => {
      store.set(id, { ...s });
      return { ...s };
    },
  };
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
