import { createSupabaseAdminClient, isSupabaseGroupsEnvConfigured } from "../supabase/client.js";
import { SupabaseGroupsStore } from "./supabaseStore.js";
import { InMemoryGroupsStore, type GroupsStore } from "./store.js";

export function createDefaultGroupsStore(): GroupsStore {
  if (isSupabaseGroupsEnvConfigured()) {
    return new SupabaseGroupsStore(createSupabaseAdminClient());
  }
  return new InMemoryGroupsStore();
}
