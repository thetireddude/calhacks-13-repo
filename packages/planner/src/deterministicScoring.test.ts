import assert from "node:assert/strict";
import test from "node:test";
import {
  APPROVED_SCORING_WEIGHTS,
  applyDeterministicScoring,
  computeDeterministicScore,
  sumApprovedWeights,
  type StubDimensionScores,
} from "./deterministicScoring.js";
import type { PlannerProposal } from "./seededCandidateActivities.js";

const allOnes: StubDimensionScores = {
  expectedAttendance: 1,
  sharedPreferenceFit: 1,
  budgetTravelFit: 1,
  inclusionFairness: 1,
};

test("approved weights match SPEC and sum to 1", () => {
  assert.equal(APPROVED_SCORING_WEIGHTS.expectedAttendance, 0.45);
  assert.equal(APPROVED_SCORING_WEIGHTS.sharedPreferenceFit, 0.3);
  assert.equal(APPROVED_SCORING_WEIGHTS.budgetTravelFit, 0.15);
  assert.equal(APPROVED_SCORING_WEIGHTS.inclusionFairness, 0.1);
  assert.equal(sumApprovedWeights(), 1);
});

test("computeDeterministicScore is the weighted sum of stub dimensions", () => {
  const dimensions: StubDimensionScores = {
    expectedAttendance: 0.8,
    sharedPreferenceFit: 0.6,
    budgetTravelFit: 0.4,
    inclusionFairness: 0.2,
  };
  const expected =
    0.8 * 0.45 + 0.6 * 0.3 + 0.4 * 0.15 + 0.2 * 0.1;
  assert.equal(computeDeterministicScore(dimensions), expected);
});

test("applyDeterministicScoring re-ranks by score and caps at input length", () => {
  const proposals: PlannerProposal[] = [
    {
      proposalId: "p-low",
      rank: 1,
      summary: "Low score",
      activityIds: ["act-low"],
      deterministicScore: 0,
    },
    {
      proposalId: "p-high",
      rank: 2,
      summary: "High score",
      activityIds: ["act-high"],
      deterministicScore: 0,
    },
  ];

  const memberContext = {
    scoringStub: {
      byActivityId: {
        "act-low": {
          expectedAttendance: 0.1,
          sharedPreferenceFit: 0.1,
          budgetTravelFit: 0.1,
          inclusionFairness: 0.1,
        },
        "act-high": allOnes,
      },
    },
  };

  const ranked = applyDeterministicScoring(proposals, memberContext);
  assert.equal(ranked.length, 2);
  assert.equal(ranked[0]?.activityIds[0], "act-high");
  assert.equal(ranked[0]?.rank, 1);
  assert.equal(ranked[1]?.activityIds[0], "act-low");
  assert.equal(ranked[1]?.rank, 2);
  assert.ok((ranked[0]?.deterministicScore ?? 0) > (ranked[1]?.deterministicScore ?? 0));
});

test("applyDeterministicScoring tie-breaks by activity id", () => {
  const score = computeDeterministicScore(allOnes);
  const proposals: PlannerProposal[] = [
    {
      proposalId: "p-b",
      rank: 1,
      summary: "B",
      activityIds: ["act-b"],
      deterministicScore: 0,
    },
    {
      proposalId: "p-a",
      rank: 2,
      summary: "A",
      activityIds: ["act-a"],
      deterministicScore: 0,
    },
  ];
  const memberContext = {
    scoringStub: { default: allOnes },
  };
  const ranked = applyDeterministicScoring(proposals, memberContext);
  assert.equal(ranked[0]?.activityIds[0], "act-a");
  assert.equal(ranked[1]?.activityIds[0], "act-b");
  assert.equal(ranked[0]?.deterministicScore, score);
  assert.equal(ranked[1]?.deterministicScore, score);
});
