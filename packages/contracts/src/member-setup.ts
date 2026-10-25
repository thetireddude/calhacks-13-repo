/** Private member preferences and availability (SPEC §6.2); aligned with DEV2-004 schema. */

export type MemberPreferencesResponse = {
  activityTags: string[];
  budgetMin: number | null;
  budgetMax: number | null;
  travelRadiusKm: number | null;
  learningOptIn: boolean;
};

export type PutMemberPreferencesRequest = MemberPreferencesResponse;

export type AvailabilityWindow = {
  startsAt: string;
  endsAt: string;
  label?: string | null;
};

export type MemberAvailabilityResponse = {
  windows: AvailabilityWindow[];
};

export type PutMemberAvailabilityRequest = MemberAvailabilityResponse;
