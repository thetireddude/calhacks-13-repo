import { randomUUID } from "node:crypto";
import type { PlanningRunResponse, Proposal } from "@gather/contracts";

export type PlanningStore = {
  createRun(
    groupId: string,
    initiatedBy: string,
    activityRequest?: string,
  ): PlanningRunResponse;
  getRun(runId: string): PlanningRunResponse | undefined;
  listProposals(runId: string): Proposal[];
};

export class InMemoryPlanningStore implements PlanningStore {
  private runs = new Map<string, PlanningRunResponse>();
  private proposalsByRun = new Map<string, Proposal[]>();

  createRun(
    groupId: string,
    initiatedBy: string,
    activityRequest?: string,
  ): PlanningRunResponse {
    const run: PlanningRunResponse = {
      id: randomUUID(),
      groupId,
      status: "pending",
      initiatedBy,
      ...(activityRequest !== undefined ? { activityRequest } : {}),
      createdAt: new Date().toISOString(),
    };
    this.runs.set(run.id, run);
    this.proposalsByRun.set(run.id, []);
    return run;
  }

  getRun(runId: string): PlanningRunResponse | undefined {
    return this.runs.get(runId);
  }

  listProposals(runId: string): Proposal[] {
    if (!this.runs.has(runId)) {
      return [];
    }
    return [...(this.proposalsByRun.get(runId) ?? [])];
  }
}
