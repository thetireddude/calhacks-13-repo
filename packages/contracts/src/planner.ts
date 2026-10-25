/**
 * Planner boundary (SPEC §6.3). Field shapes are stubs pending contract freeze (SPEC §6.4).
 * Do not invent enums or formulas called out in SPEC §11.
 */

/** Single ranked plan option returned by the planner (at most three per run). */
export interface Proposal {
  /** Stable identifier assigned by the backend when persisting; format TBD (SPEC §6.4). */
  proposalId: string;
  /** 1-based rank among returned proposals (1 = highest). Tie-breaker rules: SPEC §11. */
  rank: number;
  /** Human-readable summary safe for group-visible display (no private member data). */
  summary: string;
  /**
   * Deterministic score from approved weights only (SPEC §6.3).
   * Component formulas, normalization, and tie-breakers: SPEC §11 (unresolved).
   */
  deterministicScore?: number;
  /** Optional privacy-safe explanation of ranking; personal-agent schema: SPEC §11. */
  explanation?: string;
  /**
   * Proposal revision/version identifier when revoting applies.
   * Revision creation and vote carry-forward: SPEC §11 (unresolved).
   */
  revisionId?: string;
}

/** Authorized input assembled by the backend for `PlannerPort.generatePlans`. */
export interface PlannerInput {
  /** Group the planning run belongs to. Membership reference format: SPEC §6.4 (pending). */
  groupId: string;
  /** Planning run identifier (backend-owned persistence). State values: SPEC §11 (unresolved). */
  planningRunId: string;
  /** Natural-language or structured activity request from the initiator. */
  activityRequest?: string;
  /**
   * Member preference and availability payloads (privacy-filtered, opt-out respected).
   * Availability format, date/timezone, budget/currency: SPEC §6.4 / §11 (unresolved).
   */
  /** Opaque stub until member DTOs are frozen (SPEC §6.4). */
  memberContext?: Record<string, unknown>;
}

/** Schema-validated planner output consumed by the backend for persistence. */
export interface PlannerResult {
  planningRunId: string;
  /** Up to three ranked proposals (SPEC §6.3). */
  proposals: Proposal[];
  /**
   * ISO-8601 or agreed instant representation (SPEC §6.4 date/timezone freeze pending).
   */
  generatedAt?: string;
}

/** Documented planner entry point implemented in `packages/planner` (SPEC §6.3). */
export interface PlannerPort {
  generatePlans(input: PlannerInput): Promise<PlannerResult>;
}
