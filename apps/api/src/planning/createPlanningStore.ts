import {
  createSupabaseAdminClient,
  isSupabaseGroupsEnvConfigured,
} from "../supabase/client.js";
import { InMemoryPlanningStore, type PlanningStore } from "./store.js";
import { SupabasePlanningStore } from "./supabaseStore.js";

export function createDefaultPlanningStore(): PlanningStore {
  if (isSupabaseGroupsEnvConfigured()) {
    return new SupabasePlanningStore(createSupabaseAdminClient());
  }
  return new InMemoryPlanningStore();
}
