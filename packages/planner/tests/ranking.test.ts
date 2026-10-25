import assert from "node:assert/strict";
import test from "node:test";

import { rankPreScoredCandidates } from "../src/ranking.js";

const candidate = (id: string) => ({
  id,
  title: id,
  category: "art",
  startsAt: null,
  endsAt: null,
  venueName: null,
  city: "San Francisco",
  priceText: null,
  isFree: null,
  sourceUrl: "https://example.invalid",
  source: "seeded" as const,
});

test("ranking uses only the approved category weights", () => {
  const ranked = rankPreScoredCandidates([
    { candidate: candidate("attendance"), components: { expectedAttendance: 1, sharedPreferenceFit: 0, budgetTravelFit: 0, inclusionFairness: 0 } },
    { candidate: candidate("preference"), components: { expectedAttendance: 0, sharedPreferenceFit: 1, budgetTravelFit: 0, inclusionFairness: 0 } },
  ]);

  assert.deepEqual(ranked.map((entry) => entry.candidate.id), ["attendance", "preference"]);
  assert.equal(ranked[0]?.score, 0.45);
});

test("ranking preserves exact ties in a stable order for backend tie voting", () => {
  const ranked = rankPreScoredCandidates([
      { candidate: candidate("a"), components: { expectedAttendance: 1, sharedPreferenceFit: 0, budgetTravelFit: 0, inclusionFairness: 0 } },
      { candidate: candidate("b"), components: { expectedAttendance: 1, sharedPreferenceFit: 0, budgetTravelFit: 0, inclusionFairness: 0 } },
  ]);
  assert.equal(ranked[0]?.score, ranked[1]?.score);
  assert.deepEqual(ranked.map((entry) => entry.candidate.id), ["a", "b"]);
});
