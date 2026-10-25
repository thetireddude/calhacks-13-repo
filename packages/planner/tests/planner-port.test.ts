import assert from "node:assert/strict";
import test from "node:test";
import { createPlanner } from "../src/index.js";

test("planner factory implements the shared PlannerPort contract", async () => {
  const planner = createPlanner({ now: () => new Date("2026-10-24T12:00:00.000Z") });
  const result = await planner.generatePlans({ groupId: "group-1", planningRunId: "run-1" });
  assert.equal(result.planningRunId, "run-1");
  assert.equal(result.proposals.length, 3);
});
