import type {
  AvailabilityWindow,
  MemberAvailabilityResponse,
  MemberPreferencesResponse,
  PutMemberAvailabilityRequest,
  PutMemberPreferencesRequest,
} from "@gather/contracts";

export type MemberSetupStore = {
  getPreferences(userId: string): MemberPreferencesResponse;
  putPreferences(
    userId: string,
    body: PutMemberPreferencesRequest,
  ): MemberPreferencesResponse;
  getAvailability(userId: string): MemberAvailabilityResponse;
  putAvailability(
    userId: string,
    body: PutMemberAvailabilityRequest,
  ): MemberAvailabilityResponse;
};

const DEFAULT_PREFERENCES: MemberPreferencesResponse = {
  activityTags: [],
  budgetMin: null,
  budgetMax: null,
  travelRadiusKm: null,
  learningOptIn: false,
};

export class InMemoryMemberSetupStore implements MemberSetupStore {
  private preferences = new Map<string, MemberPreferencesResponse>();
  private availability = new Map<string, MemberAvailabilityResponse>();

  getPreferences(userId: string): MemberPreferencesResponse {
    return (
      this.preferences.get(userId) ?? {
        ...DEFAULT_PREFERENCES,
        activityTags: [],
      }
    );
  }

  putPreferences(
    userId: string,
    body: PutMemberPreferencesRequest,
  ): MemberPreferencesResponse {
    const stored = { ...body, activityTags: [...body.activityTags] };
    this.preferences.set(userId, stored);
    return this.getPreferences(userId);
  }

  getAvailability(userId: string): MemberAvailabilityResponse {
    const stored = this.availability.get(userId);
    if (!stored) {
      return { windows: [] };
    }
    return {
      windows: stored.windows.map((w: AvailabilityWindow) => ({ ...w })),
    };
  }

  putAvailability(
    userId: string,
    body: PutMemberAvailabilityRequest,
  ): MemberAvailabilityResponse {
    // Gate 1 stub: PUT replaces the caller's full availability set (no merge).
    const stored: MemberAvailabilityResponse = {
      windows: body.windows.map((w: AvailabilityWindow) => ({ ...w })),
    };
    this.availability.set(userId, stored);
    return this.getAvailability(userId);
  }
}
