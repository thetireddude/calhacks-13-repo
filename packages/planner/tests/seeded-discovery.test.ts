import assert from "node:assert/strict";
import test from "node:test";

import { SeededCandidateDiscovery } from "../src/seeded-discovery.js";

test("seeded discovery returns deterministic, bounded results", async () => {
  const discovery = new SeededCandidateDiscovery();

  const first = await discovery.discover({ city: "San Francisco", limit: 10 });
  const second = await discovery.discover({ city: "San Francisco", limit: 10 });

  assert.equal(first.length, 3);
  assert.deepEqual(first, second);
  assert.ok(first.every((candidate) => candidate.source === "seeded"));
});

test("seeded discovery filters by approved caller-supplied category", async () => {
  const discovery = new SeededCandidateDiscovery();
  const candidates = await discovery.discover({ categories: ["outdoors"] });

  assert.equal(candidates.length, 1);
  assert.equal(candidates[0]?.category, "outdoors");
});
