import assert from "node:assert/strict";
import test from "node:test";

import { isPublicExplanationSafe, prepareProviderSafeInput } from "../src/privacy.js";

test("provider input contains only bounded opted-in current inclusion debt", () => {
  const input = prepareProviderSafeInput({
    preferenceTags: ["art"],
    isAvailable: true,
    budgetCeiling: 25,
    travelRadiusKm: 8,
    learningOptIn: true,
    optedInInclusionDebt: 12,
  });

  assert.equal(input.inclusionDebt, 3);
  assert.equal("inclusionHistory" in input, false);
});

test("opted-out members never send inclusion debt", () => {
  const input = prepareProviderSafeInput({
    preferenceTags: ["art"],
    isAvailable: true,
    budgetCeiling: 25,
    travelRadiusKm: 8,
    learningOptIn: false,
    optedInInclusionDebt: 3,
  });

  assert.equal(input.inclusionDebt, null);
});

test("public explanations reject private-planning terms", () => {
  assert.equal(isPublicExplanationSafe("A well-balanced option for the group."), true);
  assert.equal(isPublicExplanationSafe("Based on Jordan's calendar."), false);
  assert.equal(isPublicExplanationSafe("Jordan is free after 7pm and loves jazz."), false);
});
