import type { RankedCandidate } from "./ranking.js";

/** The planner may surface no more than three ranked proposals (SPEC §5). */
export function selectProposalCandidates(candidates: readonly RankedCandidate[]): readonly RankedCandidate[] {
  return candidates.slice(0, 3);
}
