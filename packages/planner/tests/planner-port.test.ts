import assert from "node:assert/strict";
import test from "node:test";
import { createPlanner } from "../src/index.js";
import type { ActivityCandidate } from "../src/domain.js";

test("planner factory implements the shared PlannerPort contract", async () => {
  const planner = createPlanner({ now: () => new Date("2026-10-24T12:00:00.000Z") });
  const result = await planner.generatePlans({ groupId: "group-1", planningRunId: "run-1" });
  assert.equal(result.planningRunId, "run-1");
  assert.equal(result.proposals.length, 3);
});

test("planner factory excludes undated and past discovery candidates", async () => {
  const candidate = (id: string, startsAt: string | null): ActivityCandidate => ({
    id,
    title: id,
    category: "art",
    startsAt,
    endsAt: null,
    venueName: null,
    city: "San Francisco",
    priceText: null,
    isFree: null,
    sourceUrl: `https://example.invalid/${id}`,
    source: "seeded",
  });
  const planner = createPlanner({
    now: () => new Date("2026-10-24T12:00:00.000Z"),
    discovery: {
      async discover() {
        return [
          candidate("missing", null),
          candidate("past", "2026-10-24T11:59:59.000Z"),
          candidate("future", "2026-10-24T12:00:01.000Z"),
        ];
      },
    },
  });

  const result = await planner.generatePlans({ groupId: "group-1", planningRunId: "run-1" });
  assert.deepEqual(result.proposals.map(({ proposalId }) => proposalId), ["run-1:future"]);
});
