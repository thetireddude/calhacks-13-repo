import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  MemberAvailabilityResponse,
  MemberPreferencesResponse,
  PutMemberAvailabilityRequest,
  PutMemberPreferencesRequest,
} from "@gather/contracts";
import { DEFAULT_PREFERENCES, type MemberSetupStore } from "./store.js";

type PreferenceRow = {
  activity_tags: string[] | null;
  budget_min: number | string | null;
  budget_max: number | string | null;
  travel_radius_km: number | string | null;
  learning_opt_in: boolean;
};

type AvailabilityRow = {
  starts_at: string;
  ends_at: string;
  label: string | null;
};

function toNullableNumber(value: number | string | null): number | null {
  if (value == null) {
    return null;
  }
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function mapPreferences(row: PreferenceRow): MemberPreferencesResponse {
  return {
    activityTags: [...(row.activity_tags ?? [])],
    budgetMin: toNullableNumber(row.budget_min),
    budgetMax: toNullableNumber(row.budget_max),
    travelRadiusKm: toNullableNumber(row.travel_radius_km),
    learningOptIn: row.learning_opt_in,
  };
}

function mapWindow(row: AvailabilityRow) {
  return {
    startsAt: new Date(row.starts_at).toISOString(),
    endsAt: new Date(row.ends_at).toISOString(),
    ...(row.label !== undefined ? { label: row.label } : {}),
  };
}

async function ensureProfile(
  client: SupabaseClient,
  userId: string,
): Promise<void> {
  const { error } = await client.from("profiles").upsert(
    { id: userId },
    { onConflict: "id", ignoreDuplicates: true },
  );
  if (error) {
    throw new Error(`profiles upsert failed: ${error.message}`);
  }
}

export class SupabaseMemberSetupStore implements MemberSetupStore {
  constructor(private readonly client: SupabaseClient) {}

  async getPreferences(userId: string): Promise<MemberPreferencesResponse> {
    const { data, error } = await this.client
      .from("member_preferences")
      .select(
        "activity_tags, budget_min, budget_max, travel_radius_km, learning_opt_in",
      )
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      throw new Error(`get preferences failed: ${error.message}`);
    }
    if (!data) {
      return { ...DEFAULT_PREFERENCES, activityTags: [] };
    }
    return mapPreferences(data as PreferenceRow);
  }

  async putPreferences(
    userId: string,
    body: PutMemberPreferencesRequest,
  ): Promise<MemberPreferencesResponse> {
    await ensureProfile(this.client, userId);

    const { data, error } = await this.client
      .from("member_preferences")
      .upsert(
        {
          user_id: userId,
          activity_tags: [...body.activityTags],
          budget_min: body.budgetMin,
          budget_max: body.budgetMax,
          travel_radius_km: body.travelRadiusKm,
          learning_opt_in: body.learningOptIn,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      )
      .select(
        "activity_tags, budget_min, budget_max, travel_radius_km, learning_opt_in",
      )
      .single();

    if (error || !data) {
      throw new Error(
        `put preferences failed: ${error?.message ?? "no row returned"}`,
      );
    }
    return mapPreferences(data as PreferenceRow);
  }

  async getAvailability(userId: string): Promise<MemberAvailabilityResponse> {
    const { data, error } = await this.client
      .from("member_availability")
      .select("starts_at, ends_at, label")
      .eq("user_id", userId)
      .order("starts_at", { ascending: true });

    if (error) {
      throw new Error(`get availability failed: ${error.message}`);
    }
    return {
      windows: (data ?? []).map((row) => mapWindow(row as AvailabilityRow)),
    };
  }

  async putAvailability(
    userId: string,
    body: PutMemberAvailabilityRequest,
  ): Promise<MemberAvailabilityResponse> {
    await ensureProfile(this.client, userId);

    const { error: deleteError } = await this.client
      .from("member_availability")
      .delete()
      .eq("user_id", userId);

    if (deleteError) {
      throw new Error(`replace availability failed: ${deleteError.message}`);
    }

    if (body.windows.length > 0) {
      const { error: insertError } = await this.client
        .from("member_availability")
        .insert(
          body.windows.map((window) => ({
            user_id: userId,
            starts_at: window.startsAt,
            ends_at: window.endsAt,
            label: window.label ?? null,
          })),
        );

      if (insertError) {
        throw new Error(`insert availability failed: ${insertError.message}`);
      }
    }

    return this.getAvailability(userId);
  }
}
