import type { ActivityCandidate } from "./domain.js";

export interface ApprovedScoreComponents {
  readonly expectedAttendance: number;
  readonly sharedPreferenceFit: number;
  readonly budgetTravelFit: number;
  readonly inclusionFairness: number;
}

export interface PreScoredCandidate {
  readonly candidate: ActivityCandidate;
  readonly components: ApprovedScoreComponents;
}

export interface RankedCandidate extends PreScoredCandidate {
  readonly score: number;
}

function assertUnitInterval(label: string, value: number): void {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new RangeError(`${label} must be a finite value from 0 through 1`);
  }
}

/**
 * Applies only the approved category weights. Exact scores retain a stable
 * candidate-id order; createRankingOutcome exposes a top tie to the backend
 * so it can open the approved tie vote.
 */
export function rankPreScoredCandidates(
  candidates: readonly PreScoredCandidate[],
): readonly RankedCandidate[] {
  const ranked = candidates.map((entry) => {
    const { expectedAttendance, sharedPreferenceFit, budgetTravelFit, inclusionFairness } = entry.components;
    assertUnitInterval("expectedAttendance", expectedAttendance);
    assertUnitInterval("sharedPreferenceFit", sharedPreferenceFit);
    assertUnitInterval("budgetTravelFit", budgetTravelFit);
    assertUnitInterval("inclusionFairness", inclusionFairness);

    return {
      ...entry,
      score:
        expectedAttendance * 0.45 +
        sharedPreferenceFit * 0.3 +
        budgetTravelFit * 0.15 +
        inclusionFairness * 0.1,
    };
  });

  ranked.sort((left, right) => right.score - left.score || left.candidate.id.localeCompare(right.candidate.id));

  return ranked;
}
