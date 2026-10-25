import assert from "node:assert/strict";
import test from "node:test";
import type { PlannerInput, Proposal } from "@gather/contracts";
import { createPlanner } from "./createPlanner.js";
import type { PlannerProposal } from "./seededCandidateActivities.js";

const fixtureInput: PlannerInput = {
  groupId: "group-fixture-1",
  planningRunId: "run-fixture-1",
  activityRequest: "dinner downtown",
};

function asPlannerProposal(proposal: Proposal): PlannerProposal {
  const activityIds = (proposal as PlannerProposal).activityIds;
  assert.ok(Array.isArray(activityIds));
  assert.ok(activityIds.length > 0);
  return proposal as PlannerProposal;
}

function assertProposalShape(proposal: Proposal): void {
  assert.equal(typeof proposal.proposalId, "string");
  assert.ok(proposal.proposalId.length > 0);
  assert.equal(typeof proposal.rank, "number");
  assert.equal(typeof proposal.summary, "string");
  assert.ok(proposal.summary.length > 0);
  const withActivities = asPlannerProposal(proposal);
  assert.ok(withActivities.activityIds.every((id: string) => id.length > 0));
}

test("fixture input returns seeded proposals with activity ids", async () => {
  const planner = createPlanner();
  const result = await planner.generatePlans(fixtureInput);
  assert.equal(result.planningRunId, fixtureInput.planningRunId);
  assert.ok(result.proposals.length >= 1);
  assert.ok(result.proposals.length <= 3);
  assert.equal(result.proposals[0]?.rank, 1);
  assertProposalShape(result.proposals[0]!);
  assert.equal(asPlannerProposal(result.proposals[0]!).activityIds[0], "seed-act-dinner-01");
  assert.equal(typeof result.generatedAt, "string");
  assert.ok(result.generatedAt!.length > 0);
});

test("seeded output is deterministic for fixed ids", async () => {
  const planner = createPlanner();
  const a = await planner.generatePlans(fixtureInput);
  const b = await planner.generatePlans(fixtureInput);
  assert.equal(a.proposals.length, b.proposals.length);
  assert.deepEqual(a.proposals, b.proposals);
});

test("external provider wins when it returns candidates", async () => {
  const planner = createPlanner({
    discoveryProvider: {
      async discoverCandidates() {
        return [
          {
            activityId: "bright-data-act-99",
            summary: "Live discovery option",
          },
        ];
      },
    },
  });
  const result = await planner.generatePlans(fixtureInput);
  assert.equal(result.proposals.length, 1);
  assert.equal(
    asPlannerProposal(result.proposals[0]!).activityIds[0],
    "bright-data-act-99",
  );
  assert.match(result.proposals[0]!.proposalId, /^disc-run-fixture-1-/);
});

test("provider failure falls back to seeded catalog", async () => {
  const planner = createPlanner({
    discoveryProvider: {
      async discoverCandidates() {
        throw new Error("provider unavailable");
      },
    },
  });
  const result = await planner.generatePlans(fixtureInput);
  assert.equal(
    asPlannerProposal(result.proposals[0]!).activityIds[0],
    "seed-act-dinner-01",
  );
});

test("empty provider result falls back to seeded catalog", async () => {
  const planner = createPlanner({
    discoveryProvider: {
      async discoverCandidates() {
        return [];
      },
    },
  });
  const result = await planner.generatePlans(fixtureInput);
  assert.match(result.proposals[0]!.proposalId, /^seed-run-fixture-1-/);
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
