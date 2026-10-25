import type { PlannerInput, PlannerPort, PlannerResult, Proposal } from "@gather/contracts";
import { isPublicExplanationSafe } from "@gather/planner";
import type { PlanningStore } from "./store.js";

const MAX_PROPOSALS = 3;
const MAX_PROPOSAL_ID = 200;
const MAX_REVISION_ID = 200;
const MAX_SUMMARY = 300;
const MAX_EXPLANATION = 600;
export const DEFAULT_PLANNER_TIMEOUT_MS = 20000;

export type ValidationResult =
  | { ok: true; proposals: Proposal[] }
  | { ok: false; reason: string };

const bad = (reason: string): ValidationResult => ({ ok: false, reason });

/**
 * Backend validation of planner output before persistence. More than three
 * proposals is a contract violation (fail closed, never truncated). Any
 * violation fails the whole run; nothing partial is persisted. Returns proposals
 * sorted by rank (ranks must be exactly 1..n) or a short reason code.
 *
 * PRIVACY CAVEAT: `isPublicExplanationSafe` (applied to summary and explanation)
 * is a BEST-EFFORT substring filter, NOT a privacy guarantee. It misses emails,
 * phone numbers, addresses and phrasing like "free on Friday", and it can
 * false-positive on words like "history". The real guarantee today is that no
 * member context is passed to the planner.
 */
export function validatePlannerResult(
  result: PlannerResult,
  runId: string,
): ValidationResult {
  if (!result || typeof result !== "object") return bad("no_result");
  if (result.planningRunId !== runId) return bad("run_id_mismatch");
  if (!Array.isArray(result.proposals)) return bad("proposals_not_array");
  if (result.proposals.length > MAX_PROPOSALS) return bad("too_many_proposals");
  if (result.proposals.length < 1) return bad("no_proposals");
  const ids = new Set<string>();
  const ranks = new Set<number>();
  const clean: Proposal[] = [];
  for (const p of result.proposals) {
    if (!p || typeof p !== "object") return bad("malformed_item");
    if (
      typeof p.proposalId !== "string" ||
      p.proposalId.trim() === "" ||
      p.proposalId.length > MAX_PROPOSAL_ID
    ) {
      return bad("bad_proposal_id");
    }
    if (ids.has(p.proposalId)) return bad("duplicate_id");
    if (!Number.isInteger(p.rank) || p.rank < 1) return bad("bad_rank");
    if (ranks.has(p.rank)) return bad("duplicate_rank");
    if (
      typeof p.summary !== "string" ||
      p.summary.trim() === "" ||
      p.summary.length > MAX_SUMMARY
    ) {
      return bad("bad_summary");
    }
    if (!isPublicExplanationSafe(p.summary)) return bad("unsafe_summary");
    if (p.explanation !== undefined) {
      if (
        typeof p.explanation !== "string" ||
        p.explanation.trim() === "" ||
        p.explanation.length > MAX_EXPLANATION
      ) {
        return bad("bad_explanation");
      }
      if (!isPublicExplanationSafe(p.explanation)) return bad("unsafe_explanation");
    }
    if (p.deterministicScore !== undefined && !Number.isFinite(p.deterministicScore)) {
      return bad("bad_score");
    }
    if (
      p.revisionId !== undefined &&
      (typeof p.revisionId !== "string" || p.revisionId.length > MAX_REVISION_ID)
    ) {
      return bad("bad_revision_id");
    }
    ids.add(p.proposalId);
    ranks.add(p.rank);
    clean.push({
      proposalId: p.proposalId,
      rank: p.rank,
      summary: p.summary,
      ...(p.deterministicScore !== undefined ? { deterministicScore: p.deterministicScore } : {}),
      ...(p.explanation !== undefined ? { explanation: p.explanation } : {}),
      ...(p.revisionId !== undefined ? { revisionId: p.revisionId } : {}),
    });
  }
  clean.sort((a, b) => a.rank - b.rank);
  if (clean.some((p, i) => p.rank !== i + 1)) return bad("rank_gap");
  return { ok: true, proposals: clean };
}

export type GenerateOutcome =
  | { ok: true; proposals: Proposal[] }
  | { ok: false; conflict?: true };

export type GenerateOptions = { timeoutMs?: number };

class PlannerTimeout extends Error {}

// Per-process only: cross-process atomicity (conditional claim + transactional
// complete) is a Postgres/RPC concern on Dev 2's surface.
const inFlight = new Map<string, Promise<GenerateOutcome>>();

/** One line, no error messages or payloads: they may carry private data. */
function logFailure(runId: string, code: string): void {
  console.error(`[planner] run=${runId} ${code}`);
}

export function generateAndPersistProposals(
  planningStore: PlanningStore,
  planner: PlannerPort,
  runId: string,
  input: Omit<PlannerInput, "planningRunId">,
  options: GenerateOptions = {},
): Promise<GenerateOutcome> {
  if (inFlight.has(runId)) {
    return Promise.resolve({ ok: false, conflict: true });
  }
  const p = run(planningStore, planner, runId, input, options).finally(() => {
    inFlight.delete(runId);
  });
  inFlight.set(runId, p);
  return p;
}

async function fail(planningStore: PlanningStore, runId: string, code: string): Promise<GenerateOutcome> {
  logFailure(runId, code);
  try {
    await planningStore.markRunFailed(runId);
  } catch (e) {
    logFailure(runId, `persist_error:${errName(e)}`);
  }
  return { ok: false };
}

function errName(e: unknown): string {
  return e instanceof Error ? e.constructor.name : typeof e;
}

async function run(
  planningStore: PlanningStore,
  planner: PlannerPort,
  runId: string,
  input: Omit<PlannerInput, "planningRunId">,
  options: GenerateOptions,
): Promise<GenerateOutcome> {
  const existing = await planningStore.getRun(runId);
  if (!existing) {
    return { ok: false };
  }

  const timeoutMs = options.timeoutMs ?? DEFAULT_PLANNER_TIMEOUT_MS;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let result: PlannerResult;
  try {
    result = await Promise.race([
      planner.generatePlans({ ...input, planningRunId: runId }),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new PlannerTimeout()), timeoutMs);
      }),
    ]);
  } catch (e) {
    return e instanceof PlannerTimeout
      ? fail(planningStore, runId, "planner_timeout")
      : fail(planningStore, runId, `planner_error:${errName(e)}`);
  } finally {
    clearTimeout(timer);
  }

  const validated = validatePlannerResult(result, runId);
  if (!validated.ok) {
    return fail(planningStore, runId, `invalid_output:${validated.reason}`);
  }
  try {
    await planningStore.completeRun(runId, validated.proposals);
  } catch (e) {
    return fail(planningStore, runId, `persist_error:${errName(e)}`);
  }
  return { ok: true, proposals: validated.proposals };
}
