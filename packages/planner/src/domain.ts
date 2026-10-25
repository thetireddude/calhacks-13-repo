/**
 * Internal planner-domain types.
 *
 * These types intentionally do not replace the pending public PlannerInput /
 * PlannerResult contract maintained by Developer 2.
 */
export type DiscoverySource = "seeded" | "google_maps" | "yelp" | "facebook_events" | "funcheap" | "dothebay";

export interface ActivityCandidate {
  readonly id: string;
  readonly title: string;
  readonly category: string;
  readonly startsAt: string | null;
  readonly endsAt: string | null;
  readonly venueName: string | null;
  readonly city: string;
  readonly priceText: string | null;
  readonly isFree: boolean | null;
  readonly sourceUrl: string;
  readonly source: DiscoverySource;
}

export interface DiscoveryQuery {
  readonly city?: string;
  readonly categories?: readonly string[];
  readonly limit?: number;
}

export interface CandidateDiscoveryPort {
  discover(query: DiscoveryQuery): Promise<readonly ActivityCandidate[]>;
}

/** A provider evaluation that is safe to pass to later deterministic planning. */
export interface PersonalEvaluation {
  readonly feasible: boolean;
  readonly preferenceTags: readonly string[];
  readonly explanation: string;
}

export interface PersonalEvaluationProvider {
  evaluate(input: unknown): Promise<PersonalEvaluation>;
}
