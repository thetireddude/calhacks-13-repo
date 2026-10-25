import assert from "node:assert/strict";
import test from "node:test";

import { isPublicExplanationSafe, prepareProviderSafeInput } from "../src/privacy.js";

test("opted-out history never enters provider input", () => {
  const input = prepareProviderSafeInput({
    preferenceTags: ["art"],
    isAvailable: true,
    budgetCeiling: 25,
    travelRadiusKm: 8,
    learningOptIn: false,
    optedInInclusionHistory: ["private-detail"],
  });

  assert.deepEqual(input.inclusionHistory, []);
});

test("public explanations reject private-planning terms", () => {
  assert.equal(isPublicExplanationSafe("A well-balanced option for the group."), true);
  assert.equal(isPublicExplanationSafe("Based on Jordan's calendar."), false);
});
