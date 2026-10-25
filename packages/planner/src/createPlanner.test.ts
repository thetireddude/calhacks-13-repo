import assert from "node:assert/strict";
import test from "node:test";
import type { PlannerInput } from "@gather/contracts";
import { createPlanner } from "./createPlanner.js";

const fixtureInput: PlannerInput = {
  groupId: "group-fixture-1",
  planningRunId: "run-fixture-1",
  activityRequest: "dinner downtown",
};

function assertProposalShape(
  proposal: NonNullable<
    Awaited<ReturnType<ReturnType<typeof createPlanner>["generatePlans"]>>
  >["proposals"][number],
): void {
  assert.equal(typeof proposal.proposalId, "string");
  assert.ok(proposal.proposalId.length > 0);
  assert.equal(typeof proposal.rank, "number");
  assert.equal(typeof proposal.summary, "string");
  assert.ok(proposal.summary.length > 0);
}

test("fixture input returns one proposal with valid schema", async () => {
  const planner = createPlanner();
  const result = await planner.generatePlans(fixtureInput);
  assert.equal(result.planningRunId, fixtureInput.planningRunId);
  assert.equal(result.proposals.length, 1);
  assert.ok(result.proposals.length <= 3);
  assert.equal(result.proposals[0]?.rank, 1);
  assertProposalShape(result.proposals[0]!);
  assert.equal(typeof result.generatedAt, "string");
  assert.ok(result.generatedAt!.length > 0);
});

test("stub output is deterministic for fixed ids", async () => {
  const planner = createPlanner();
  const a = await planner.generatePlans(fixtureInput);
  const b = await planner.generatePlans(fixtureInput);
  assert.equal(a.proposals.length, b.proposals.length);
  assert.deepEqual(a.proposals[0], b.proposals[0]);
});

test("createPlanner rejects missing groupId", async () => {
  const planner = createPlanner();
  await assert.rejects(() =>
    planner.generatePlans({ groupId: "", planningRunId: "run1" }),
  );
});

test("createPlanner rejects missing planningRunId", async () => {
  const planner = createPlanner();
  await assert.rejects(() =>
    planner.generatePlans({ groupId: "g1", planningRunId: "  " }),
  );
});
