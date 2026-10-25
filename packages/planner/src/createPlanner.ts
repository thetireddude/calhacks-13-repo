import type {
  PlannerInput,
  PlannerPort,
  PlannerResult,
  Proposal,
} from "@gather/contracts";
import type { DiscoveryProvider } from "./discoveryProvider.js";
import { applyDeterministicScoring } from "./deterministicScoring.js";
import {
  buildSeededProposal,
  pickSeededCandidates,
  type PlannerProposal,
} from "./seededCandidateActivities.js";

export interface CreatePlannerOptions {
  discoveryProvider?: DiscoveryProvider;
}

function assertInput(input: PlannerInput): void {
  if (!input.groupId?.trim()) {
    throw new Error("PlannerInput.groupId is required");
  }
  if (!input.planningRunId?.trim()) {
    throw new Error("PlannerInput.planningRunId is required");
  }
}

function proposalFromDiscoveryCandidate(
  candidate: { activityId: string; summary: string },
  rank: number,
  planningRunId: string,
): PlannerProposal {
  return {
    proposalId: `disc-${planningRunId}-${candidate.activityId}`,
    rank,
    summary: candidate.summary,
    activityIds: [candidate.activityId],
    deterministicScore: 0,
    explanation: "Ranked from external discovery provider.",
  };
}

function toPlannerResult(
  input: PlannerInput,
  proposals: PlannerProposal[],
  generatedAt: string,
): PlannerResult {
  return {
    planningRunId: input.planningRunId,
    generatedAt,
    proposals: proposals as Proposal[],
  };
}

async function resolveCandidates(
  input: PlannerInput,
  discoveryProvider?: DiscoveryProvider,
): Promise<PlannerProposal[]> {
  if (discoveryProvider) {
    try {
      const external = await discoveryProvider.discoverCandidates(input);
      if (external.length > 0) {
        return external.slice(0, 3).map((candidate, index) =>
          proposalFromDiscoveryCandidate(
            candidate,
            index + 1,
            input.planningRunId,
          ),
        );
      }
    } catch {
      // Fall through to seeded catalog (SPEC §5 Bright Data failure path).
    }
  }

  return pickSeededCandidates(input).map((activity, index) =>
    buildSeededProposal(activity, index + 1, input.planningRunId),
  );
}

export function createPlanner(options: CreatePlannerOptions = {}): PlannerPort {
  const { discoveryProvider } = options;
  return {
    async generatePlans(input: PlannerInput): Promise<PlannerResult> {
      assertInput(input);
      const generatedAt = new Date().toISOString();
      const candidates = await resolveCandidates(input, discoveryProvider);
      const proposals = applyDeterministicScoring(
        candidates,
        input.memberContext,
      );
      return toPlannerResult(input, proposals, generatedAt);
    },
  };
}
