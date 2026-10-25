import type { PlannerInput } from "@gather/contracts";
import type { PlannerProposal } from "./seededCandidateActivities.js";

/** Approved SPEC §5 category weights (fixed; sum = 1). */
export const APPROVED_SCORING_WEIGHTS = {
  expectedAttendance: 0.45,
  sharedPreferenceFit: 0.3,
  budgetTravelFit: 0.15,
  inclusionFairness: 0.1,
} as const;

export type ScoringWeightKey = keyof typeof APPROVED_SCORING_WEIGHTS;

/** Explicit stub dimension scores (0–1); formulas are unresolved (SPEC §11). */
export interface StubDimensionScores {
  expectedAttendance: number;
  sharedPreferenceFit: number;
  budgetTravelFit: number;
  inclusionFairness: number;
}

/** Optional test/fixture hook on `PlannerInput.memberContext.scoringStub`. */
export interface PlannerScoringStub {
  /** Applied when no `byActivityId` entry matches the proposal activity. */
  default?: StubDimensionScores;
  byActivityId?: Record<string, StubDimensionScores>;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function parseDimensionScores(raw: unknown): StubDimensionScores | undefined {
  if (!raw || typeof raw !== "object") {
    return undefined;
  }
  const record = raw as Record<string, unknown>;
  const expectedAttendance = record.expectedAttendance;
  const sharedPreferenceFit = record.sharedPreferenceFit;
  const budgetTravelFit = record.budgetTravelFit;
  const inclusionFairness = record.inclusionFairness;
  if (
    !isFiniteNumber(expectedAttendance) ||
    !isFiniteNumber(sharedPreferenceFit) ||
    !isFiniteNumber(budgetTravelFit) ||
    !isFiniteNumber(inclusionFairness)
  ) {
    return undefined;
  }
  return {
    expectedAttendance,
    sharedPreferenceFit,
    budgetTravelFit,
    inclusionFairness,
  };
}

export function readScoringStub(
  memberContext?: PlannerInput["memberContext"],
): PlannerScoringStub | undefined {
  if (!memberContext) {
    return undefined;
  }
  const raw = memberContext.scoringStub;
  if (!raw || typeof raw !== "object") {
    return undefined;
  }
  const record = raw as Record<string, unknown>;
  const stub: PlannerScoringStub = {};
  const defaultDimensions = parseDimensionScores(record.default);
  if (defaultDimensions) {
    stub.default = defaultDimensions;
  }
  const byActivityIdRaw = record.byActivityId;
  if (byActivityIdRaw && typeof byActivityIdRaw === "object") {
    const byActivityId: Record<string, StubDimensionScores> = {};
    for (const [activityId, dimensionsRaw] of Object.entries(byActivityIdRaw)) {
      const dimensions = parseDimensionScores(dimensionsRaw);
      if (dimensions) {
        byActivityId[activityId] = dimensions;
      }
    }
    if (Object.keys(byActivityId).length > 0) {
      stub.byActivityId = byActivityId;
    }
  }
  if (!stub.default && !stub.byActivityId) {
    return undefined;
  }
  return stub;
}

/** Weighted sum using approved weights only. */
export function computeDeterministicScore(
  dimensions: StubDimensionScores,
): number {
  return (
    dimensions.expectedAttendance *
      APPROVED_SCORING_WEIGHTS.expectedAttendance +
    dimensions.sharedPreferenceFit *
      APPROVED_SCORING_WEIGHTS.sharedPreferenceFit +
    dimensions.budgetTravelFit * APPROVED_SCORING_WEIGHTS.budgetTravelFit +
    dimensions.inclusionFairness * APPROVED_SCORING_WEIGHTS.inclusionFairness
  );
}

function resolveStubDimensions(
  proposal: PlannerProposal,
  stub: PlannerScoringStub,
): StubDimensionScores | undefined {
  const activityId = proposal.activityIds[0];
  if (activityId && stub.byActivityId?.[activityId]) {
    return stub.byActivityId[activityId];
  }
  return stub.default;
}

function proposalSortKey(proposal: PlannerProposal): string {
  return proposal.activityIds[0] ?? proposal.proposalId;
}

/** Apply stub dimensions and re-rank by descending deterministic score. */
export function applyDeterministicScoring(
  proposals: PlannerProposal[],
  memberContext?: PlannerInput["memberContext"],
): PlannerProposal[] {
  const stub = readScoringStub(memberContext);
  if (!stub) {
    return proposals;
  }

  const scored = proposals.map((proposal) => {
    const dimensions = resolveStubDimensions(proposal, stub);
    if (!dimensions) {
      return proposal;
    }
    const deterministicScore = computeDeterministicScore(dimensions);
    return { ...proposal, deterministicScore };
  });

  const sorted = [...scored].sort((a, b) => {
    const scoreDiff =
      (b.deterministicScore ?? 0) - (a.deterministicScore ?? 0);
    if (scoreDiff !== 0) {
      return scoreDiff;
    }
    return proposalSortKey(a).localeCompare(proposalSortKey(b));
  });

  return sorted.map((proposal, index) => ({
    ...proposal,
    rank: index + 1,
  }));
}

export function sumApprovedWeights(): number {
  return (
    APPROVED_SCORING_WEIGHTS.expectedAttendance +
    APPROVED_SCORING_WEIGHTS.sharedPreferenceFit +
    APPROVED_SCORING_WEIGHTS.budgetTravelFit +
    APPROVED_SCORING_WEIGHTS.inclusionFairness
  );
}
