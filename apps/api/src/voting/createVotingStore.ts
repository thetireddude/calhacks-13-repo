import {
  createSupabaseAdminClient,
  isSupabaseGroupsEnvConfigured,
} from "../supabase/client.js";
import { InMemoryVotingStore, type VotingStore } from "./store.js";
import { SupabaseVotingStore } from "./supabaseStore.js";

export function createDefaultVotingStore(): VotingStore {
  if (isSupabaseGroupsEnvConfigured()) {
    return new SupabaseVotingStore(createSupabaseAdminClient());
  }
  return new InMemoryVotingStore();
}
