import type { SupabaseClient } from "@supabase/supabase-js";
import type { MeResponse } from "@gather/contracts";
import type { ProfileStore } from "./profileStore.js";

type ProfileRow = {
  id: string;
  display_name: string | null;
};

export class SupabaseProfileStore implements ProfileStore {
  constructor(private readonly client: SupabaseClient) {}

  async getOrCreateProfile(userId: string): Promise<MeResponse> {
    const { error: upsertError } = await this.client.from("profiles").upsert(
      { id: userId },
      { onConflict: "id", ignoreDuplicates: true },
    );
    if (upsertError) {
      throw new Error(`profiles upsert failed: ${upsertError.message}`);
    }

    const { data, error } = await this.client
      .from("profiles")
      .select("id, display_name")
      .eq("id", userId)
      .single();

    if (error || !data) {
      throw new Error(
        `get profile failed: ${error?.message ?? "no row returned"}`,
      );
    }

    const row = data as ProfileRow;
    return {
      id: row.id,
      profile: { displayName: row.display_name ?? null },
    };
  }
}
