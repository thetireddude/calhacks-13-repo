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

export class UnresolvedRankingTieError extends Error {
  public constructor() {
    super("Ranking tie requires an approved tie-break rule");
    this.name = "UnresolvedRankingTieError";
  }
}

function assertUnitInterval(label: string, value: number): void {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new RangeError(`${label} must be a finite value from 0 through 1`);
  }
}

/**
 * Applies only the category weights approved in SPEC §5. It deliberately
 * accepts precomputed components because their formulas remain unresolved.
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

  ranked.sort((left, right) => right.score - left.score);
  for (let index = 1; index < ranked.length; index += 1) {
    if (ranked[index - 1]?.score === ranked[index]?.score) {
      throw new UnresolvedRankingTieError();
    }
  }

  return ranked;
}
