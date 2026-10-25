import assert from "node:assert/strict";
import test from "node:test";

import { parseActivityCandidate, parsePersonalEvaluation, PlannerValidationError } from "../src/validation.js";

const candidate = {
  id: "candidate-1",
  title: "Public Event",
  category: "art",
  startsAt: "2026-10-31T10:00:00-07:00",
  endsAt: null,
  venueName: "Venue",
  city: "San Francisco",
  priceText: "Free",
  isFree: true,
  sourceUrl: "https://example.com/events/1",
  source: "seeded",
};

test("candidate validation accepts normalized public records", () => {
  assert.deepEqual(parseActivityCandidate(candidate), candidate);
});

test("candidate validation rejects non-public source URLs", () => {
  assert.throws(
    () => parseActivityCandidate({ ...candidate, sourceUrl: "file:///private-calendar" }),
    PlannerValidationError,
  );
});

test("personal evaluation validation rejects private explanations", () => {
  assert.throws(
    () => parsePersonalEvaluation({ feasible: true, preferenceTags: ["art"], explanation: "Their calendar is free." }),
    PlannerValidationError,
  );
});
