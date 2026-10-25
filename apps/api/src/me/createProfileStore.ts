import {
  createSupabaseAdminClient,
  isSupabaseGroupsEnvConfigured,
} from "../supabase/client.js";
import { InMemoryProfileStore, type ProfileStore } from "./profileStore.js";
import { SupabaseProfileStore } from "./supabaseProfileStore.js";

export function createDefaultProfileStore(): ProfileStore {
  if (isSupabaseGroupsEnvConfigured()) {
    return new SupabaseProfileStore(createSupabaseAdminClient());
  }
  return new InMemoryProfileStore();
}
