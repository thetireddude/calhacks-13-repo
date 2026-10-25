import type { PlannerInput, PlannerPort, PlannerResult } from "@gather/contracts";

const MAX_PROPOSALS = 3;

/** Gate 1 API-local mock until `@gather/planner` implements `PlannerPort` (Dev 3). */
export function createMockPlannerPort(): PlannerPort {
  return {
    async generatePlans(input: PlannerInput): Promise<PlannerResult> {
      const label = input.activityRequest?.trim() || "group outing";
      const proposals = Array.from({ length: MAX_PROPOSALS }, (_, i) => {
        const rank = i + 1;
        return {
          proposalId: `mock-${input.planningRunId}-${rank}`,
          rank,
          summary: `Option ${rank}: ${label}`,
          deterministicScore: 0,
          explanation: "Mock planner ranking (Gate 1).",
        };
      });
      return {
        planningRunId: input.planningRunId,
        generatedAt: new Date().toISOString(),
        proposals,
      };
    },
  };
}
