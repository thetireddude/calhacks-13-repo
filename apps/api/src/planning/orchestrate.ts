import type { PlannerInput, PlannerPort, PlannerResult, Proposal } from "@gather/contracts";
import { isPublicExplanationSafe } from "@gather/planner";
import type { PlanningStore } from "./store.js";

const MAX_PROPOSALS = 3;

/**
 * Backend validation of planner output before persistence. Returns the proposals
 * or undefined when the output violates the contract. A violation (including an
 * unsafe explanation) fails the whole run; nothing partial is persisted. Only proposals past the third are truncated (pre-existing safety).
 */
export function validatePlannerResult(
  result: PlannerResult,
  runId: string,
): Proposal[] | undefined {
  if (!result || typeof result !== "object" || result.planningRunId !== runId) {
    return undefined;
  }
  if (!Array.isArray(result.proposals)) {
    return undefined;
  }
  // Existing behavior (planning.test.ts): extra proposals beyond three are dropped, not a failure.
  const proposals = result.proposals.slice(0, MAX_PROPOSALS);
  if (proposals.length < 1) {
    return undefined;
  }
  const ids = new Set<string>();
  const ranks = new Set<number>();
  const clean: Proposal[] = [];
  for (const p of proposals) {
    if (
      !p ||
      typeof p !== "object" ||
      typeof p.proposalId !== "string" ||
      p.proposalId.trim() === "" ||
      !Number.isInteger(p.rank) ||
      p.rank < 1 ||
      typeof p.summary !== "string" ||
      p.summary.trim() === "" ||
      ids.has(p.proposalId) ||
      ranks.has(p.rank)
    ) {
      return undefined;
    }
    if (
      p.explanation !== undefined &&
      (typeof p.explanation !== "string" || !isPublicExplanationSafe(p.explanation))
    ) {
      return undefined;
    }
    if (
      p.deterministicScore !== undefined &&
      !Number.isFinite(p.deterministicScore)
    ) {
      return undefined;
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
  return clean;
}

export async function generateAndPersistProposals(
  planningStore: PlanningStore,
  planner: PlannerPort,
  runId: string,
  input: Omit<PlannerInput, "planningRunId">,
): Promise<{ ok: true; proposals: Proposal[] } | { ok: false }> {
  const run = await planningStore.getRun(runId);
  if (!run) {
    return { ok: false };
  }

  try {
    const result = await planner.generatePlans({
      ...input,
      planningRunId: runId,
    });
    const proposals = validatePlannerResult(result, runId);
    if (!proposals) {
      await planningStore.markRunFailed(runId);
      return { ok: false };
    }
    await planningStore.completeRun(runId, proposals);
    return { ok: true, proposals };
  } catch {
    await planningStore.markRunFailed(runId);
    return { ok: false };
  }
}
