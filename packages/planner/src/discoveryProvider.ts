import type { PlannerInput } from "@gather/contracts";

/** Normalized discovery candidate (external or stub). */
export interface DiscoveryCandidate {
  activityId: string;
  summary: string;
}

/** Optional external discovery; planner falls back to seeded catalog when absent or empty. */
export interface DiscoveryProvider {
  discoverCandidates(input: PlannerInput): Promise<DiscoveryCandidate[]>;
}
