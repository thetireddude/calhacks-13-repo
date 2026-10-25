import type { RankedCandidate } from "./ranking.js";

export type RankingOutcome =
  | { readonly kind: "ranked"; readonly candidates: readonly RankedCandidate[] }
  | { readonly kind: "tie"; readonly candidates: readonly [RankedCandidate, RankedCandidate] };

/** The backend owns opening the vote represented by a tie outcome. */
export function createRankingOutcome(candidates: readonly RankedCandidate[]): RankingOutcome {
  const first = candidates[0];
  const second = candidates[1];
  if (first && second && first.score === second.score) return { kind: "tie", candidates: [first, second] };
  return { kind: "ranked", candidates };
}
