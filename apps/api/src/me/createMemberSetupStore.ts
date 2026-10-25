import {
  createSupabaseAdminClient,
  isSupabaseGroupsEnvConfigured,
} from "../supabase/client.js";
import { InMemoryMemberSetupStore, type MemberSetupStore } from "./store.js";
import { SupabaseMemberSetupStore } from "./supabaseSetupStore.js";

export function createDefaultMemberSetupStore(): MemberSetupStore {
  if (isSupabaseGroupsEnvConfigured()) {
    return new SupabaseMemberSetupStore(createSupabaseAdminClient());
  }
  return new InMemoryMemberSetupStore();
}
