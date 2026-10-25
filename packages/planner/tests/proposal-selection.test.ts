import assert from "node:assert/strict";
import test from "node:test";

import { selectProposalCandidates } from "../src/proposal-selection.js";

test("proposal selection returns no more than three ranked candidates", () => {
  const candidates = Array.from({ length: 4 }, (_, index) => ({
    candidate: {
      id: String(index),
      title: `Event ${index}`,
      category: "art",
      startsAt: null,
      endsAt: null,
      venueName: null,
      city: "San Francisco",
      priceText: null,
      isFree: null,
      sourceUrl: "https://example.invalid",
      source: "seeded" as const,
    },
    components: { expectedAttendance: 1, sharedPreferenceFit: 1, budgetTravelFit: 1, inclusionFairness: 1 },
    score: 1 - index / 10,
  }));
  assert.equal(selectProposalCandidates(candidates).length, 3);
});
