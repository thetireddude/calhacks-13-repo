import type { PlannerInput, PlannerPort, PlannerResult, Proposal } from "@gather/contracts";
import type { CandidateDiscoveryPort } from "./domain.js";
import { SeededCandidateDiscovery } from "./seeded-discovery.js";

export interface PlannerFactoryOptions {
  readonly discovery?: CandidateDiscoveryPort;
  readonly now?: () => Date;
}

export function createPlanner(options: PlannerFactoryOptions = {}): PlannerPort {
  const discovery = options.discovery ?? new SeededCandidateDiscovery();
  const now = options.now ?? (() => new Date());
  return {
    async generatePlans(input: PlannerInput): Promise<PlannerResult> {
      if (!input.groupId.trim() || !input.planningRunId.trim()) throw new Error("groupId and planningRunId are required");
      const candidates = await discovery.discover({ limit: 3 });
      const proposals: Proposal[] = candidates.map((candidate, index) => ({
        proposalId: `${input.planningRunId}:${candidate.id}`,
        rank: index + 1,
        summary: candidate.venueName ? `${candidate.title} at ${candidate.venueName}` : candidate.title,
        explanation: "Recommended from available public activities.",
      }));
      return { planningRunId: input.planningRunId, proposals, generatedAt: now().toISOString() };
    },
  };
}

export type {
  ActivityCandidate,
  CandidateDiscoveryPort,
  DiscoveryQuery,
  DiscoverySource,
  PersonalEvaluation,
  PersonalEvaluationProvider,
} from "./domain.js";
export { SeededCandidateDiscovery } from "./seeded-discovery.js";
export { FallbackCandidateDiscovery } from "./fallback-discovery.js";
export type { DiscoveryFailure, DiscoveryResult } from "./fallback-discovery.js";
export {
  ProviderUnavailableError,
  UnavailablePersonalEvaluationProvider,
} from "./provider.js";
export type { ProviderAdapterConfig } from "./provider.js";
export { prepareProviderSafeInput, isPublicExplanationSafe } from "./privacy.js";
export type { AuthorizedPersonalContext, ProviderSafePersonalInput } from "./privacy.js";
export { rankPreScoredCandidates, UnresolvedRankingTieError } from "./ranking.js";
export type { ApprovedScoreComponents, PreScoredCandidate, RankedCandidate } from "./ranking.js";
export { selectProposalCandidates } from "./proposal-selection.js";
export { parseActivityCandidate, parsePersonalEvaluation, PlannerValidationError } from "./validation.js";
export { BrightDataDatasetClient, BrightDataRequestError } from "./bright-data.js";
export type { BrightDataClientConfig, BrightDataDatasetRequest, FetchLike } from "./bright-data.js";
export { calculateApprovedScoreComponents, meetsMinimumFeasibleMembers } from "./scoring.js";
export type { MemberCandidateAssessment } from "./scoring.js";
export { createRankingOutcome } from "./tie-resolution.js";
export type { RankingOutcome } from "./tie-resolution.js";
