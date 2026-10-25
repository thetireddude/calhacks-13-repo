import type {
  PlannerInput,
  PlannerPort,
  PlannerResult,
} from "@gather/contracts";

function assertInput(input: PlannerInput): void {
  if (!input.groupId?.trim()) {
    throw new Error("PlannerInput.groupId is required");
  }
  if (!input.planningRunId?.trim()) {
    throw new Error("PlannerInput.planningRunId is required");
  }
}

export function createPlanner(): PlannerPort {
  return {
    async generatePlans(input: PlannerInput): Promise<PlannerResult> {
      assertInput(input);
      const generatedAt = new Date().toISOString();
      return {
        planningRunId: input.planningRunId,
        generatedAt,
        proposals: [
          {
            proposalId: `stub-${input.planningRunId}-1`,
            rank: 1,
            summary: "Stub plan (DEV3-001 seeded path placeholder)",
            deterministicScore: 0,
            explanation:
              "Deterministic scoring and discovery run in later tasks.",
          },
        ],
      };
    },
  };
}
