import assert from "node:assert/strict";
import test from "node:test";

import { selectProposalCandidates } from "../src/proposal-selection.js";

test("proposal selection returns no more than three ranked candidates", () => {
  const candidates = Array.from({ length: 4 }, (_, index) => ({
    candidate: {
      id: String(index),
      title: `Event ${index}`,
      category: "art",
      startsAt: "2099-01-01T10:00:00Z",
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

test("proposal selection excludes missing, malformed, and past start times", () => {
  const base = {
    components: { expectedAttendance: 1, sharedPreferenceFit: 1, budgetTravelFit: 1, inclusionFairness: 1 },
    score: 1,
  };
  const candidates = [
    { ...base, candidate: { id: "missing", startsAt: null } },
    { ...base, candidate: { id: "malformed", startsAt: "not-a-date" } },
    { ...base, candidate: { id: "past", startsAt: "2026-01-01T00:00:00Z" } },
    { ...base, candidate: { id: "future", startsAt: "2027-01-01T00:00:00Z" } },
  ].map(({ candidate, ...ranked }) => ({
    ...ranked,
    candidate: {
      ...candidate,
      title: "Event",
      category: "art",
      endsAt: null,
      venueName: null,
      city: "San Francisco",
      priceText: null,
      isFree: null,
      sourceUrl: "https://example.invalid",
      source: "seeded" as const,
    },
  }));

  assert.deepEqual(
    selectProposalCandidates(candidates, new Date("2026-10-24T00:00:00Z")).map(({ candidate }) => candidate.id),
    ["future"],
  );
});
