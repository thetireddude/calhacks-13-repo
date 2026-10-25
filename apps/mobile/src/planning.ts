import type {
  CreatePlanningRunRequest,
  PlanningRunProposalsResponse,
  PlanningRunResponse,
  Proposal,
} from "@gather/contracts";

// Boundary the real API client will implement. Methods mirror SPEC section 6.2:
//   POST /v1/groups/:groupId/planning-runs, GET /v1/planning-runs/:runId,
//   GET /v1/planning-runs/:runId/proposals.
// There is no retry route; a retry is a new POST. Run states and retry policy are SPEC section 11.
export interface PlanningClient {
  createRun(groupId: string, req: CreatePlanningRunRequest): Promise<PlanningRunResponse>;
  getRun(runId: string): Promise<PlanningRunResponse>;
  getProposals(runId: string): Promise<PlanningRunProposalsResponse>;
}

export type PlanningErrorCode = "not_found";
export class PlanningError extends Error {
  constructor(readonly code: PlanningErrorCode) {
    super(code);
    this.name = "PlanningError";
  }
}

export type MockPlanningScenario = "three" | "many" | "empty" | "failed" | "pending";

function proposal(rank: number): Proposal {
  return {
    proposalId: `proposal-${rank}`,
    rank,
    summary: `Option ${rank}: Saturday hike`,
    explanation: `Ranked ${rank} by the planner for group fit.`,
  };
}

export const FIXTURE_THREE_PROPOSALS: Proposal[] = [proposal(1), proposal(2), proposal(3)];
export const FIXTURE_MANY_PROPOSALS: Proposal[] = [1, 2, 3, 4, 5].map(proposal);

const SCENARIO_STATUS: Record<MockPlanningScenario, string> = {
  three: "completed",
  many: "completed",
  empty: "completed",
  failed: "failed",
  pending: "pending",
};

// In-memory mock. Every run takes the scenario's fixed outcome; status strings are stubs (SPEC section 11).
export function createMockPlanningClient(scenario: MockPlanningScenario = "three"): PlanningClient {
  let seq = 0;
  const runs = new Map<string, PlanningRunResponse>();
  const proposals =
    scenario === "many" ? FIXTURE_MANY_PROPOSALS : scenario === "three" ? FIXTURE_THREE_PROPOSALS : [];
  const need = (runId: string) => {
    const r = runs.get(runId);
    if (!r) throw new PlanningError("not_found");
    return r;
  };
  return {
    createRun: async (groupId, req) => {
      seq += 1;
      const run: PlanningRunResponse = {
        id: `run-${seq}`,
        groupId,
        status: SCENARIO_STATUS[scenario],
        initiatedBy: "user-me",
        createdAt: new Date().toISOString(),
        ...(req.activityRequest ? { activityRequest: req.activityRequest } : {}),
      };
      runs.set(run.id, run);
      return { ...run };
    },
    getRun: async (runId) => ({ ...need(runId) }),
    getProposals: async (runId) => {
      need(runId);
      return { proposals: proposals.map((p) => ({ ...p })) };
    },
  };
}
