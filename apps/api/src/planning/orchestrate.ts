import type { PlannerInput, PlannerPort, Proposal } from "@gather/contracts";
import type { PlanningStore } from "./store.js";

const MAX_PERSISTED_PROPOSALS = 3;

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
    const proposals = result.proposals.slice(0, MAX_PERSISTED_PROPOSALS);
    await planningStore.completeRun(runId, proposals);
    return { ok: true, proposals };
  } catch {
    await planningStore.markRunFailed(runId);
    return { ok: false };
  }
}
