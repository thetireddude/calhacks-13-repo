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
