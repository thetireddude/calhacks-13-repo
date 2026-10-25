import type {
  AvailabilityWindow,
  MemberAvailabilityResponse,
  MemberPreferencesResponse,
  PutMemberAvailabilityRequest,
  PutMemberPreferencesRequest,
} from "@gather/contracts";

export type MemberSetupStore = {
  getPreferences(userId: string): Promise<MemberPreferencesResponse>;
  putPreferences(
    userId: string,
    body: PutMemberPreferencesRequest,
  ): Promise<MemberPreferencesResponse>;
  getAvailability(userId: string): Promise<MemberAvailabilityResponse>;
  putAvailability(
    userId: string,
    body: PutMemberAvailabilityRequest,
  ): Promise<MemberAvailabilityResponse>;
};

export const DEFAULT_PREFERENCES: MemberPreferencesResponse = {
  activityTags: [],
  budgetMin: null,
  budgetMax: null,
  travelRadiusKm: null,
  learningOptIn: false,
};

export class InMemoryMemberSetupStore implements MemberSetupStore {
  private preferences = new Map<string, MemberPreferencesResponse>();
  private availability = new Map<string, MemberAvailabilityResponse>();

  async getPreferences(userId: string): Promise<MemberPreferencesResponse> {
    return (
      this.preferences.get(userId) ?? {
        ...DEFAULT_PREFERENCES,
        activityTags: [],
      }
    );
  }

  async putPreferences(
    userId: string,
    body: PutMemberPreferencesRequest,
  ): Promise<MemberPreferencesResponse> {
    const stored = { ...body, activityTags: [...body.activityTags] };
    this.preferences.set(userId, stored);
    return this.getPreferences(userId);
  }

  async getAvailability(userId: string): Promise<MemberAvailabilityResponse> {
    const stored = this.availability.get(userId);
    if (!stored) {
      return { windows: [] };
    }
    return {
      windows: stored.windows.map((w: AvailabilityWindow) => ({ ...w })),
    };
  }

  async putAvailability(
    userId: string,
    body: PutMemberAvailabilityRequest,
  ): Promise<MemberAvailabilityResponse> {
    // PUT replaces the caller's full availability set (no merge).
    const stored: MemberAvailabilityResponse = {
      windows: body.windows.map((w: AvailabilityWindow) => ({ ...w })),
    };
    this.availability.set(userId, stored);
    return this.getAvailability(userId);
  }
}
