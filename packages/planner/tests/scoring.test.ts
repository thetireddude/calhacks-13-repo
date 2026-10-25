import assert from "node:assert/strict";
import test from "node:test";
import { calculateApprovedScoreComponents, meetsMinimumFeasibleMembers } from "../src/scoring.js";

test("approved scoring weights opted-in exclusion debt without using opted-out debt", () => {
  const assessments = [
    { available: true, preferenceOverlap: 1, priceKnown: true, withinBudget: true, distanceKnown: true, withinTravelRadius: true, learningOptIn: true, inclusionDebt: 3 },
    { available: false, preferenceOverlap: 0, priceKnown: true, withinBudget: true, distanceKnown: true, withinTravelRadius: true, learningOptIn: false, inclusionDebt: 3 },
  ];
  const score = calculateApprovedScoreComponents(assessments);
  assert.equal(score.expectedAttendance, 0.5);
  assert.equal(score.inclusionFairness, 0.8);
  assert.equal(meetsMinimumFeasibleMembers(assessments), false);
});
