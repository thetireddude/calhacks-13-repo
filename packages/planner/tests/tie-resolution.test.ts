import assert from "node:assert/strict";
import test from "node:test";
import { createRankingOutcome } from "../src/tie-resolution.js";

test("top-score ties are returned for a backend-owned vote", () => {
  const ranked = [{ candidate: { id: "a" }, components: {}, score: 1 }, { candidate: { id: "b" }, components: {}, score: 1 }] as never;
  const outcome = createRankingOutcome(ranked);
  assert.equal(outcome.kind, "tie");
});
