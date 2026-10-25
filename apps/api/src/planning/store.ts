import { randomUUID } from "node:crypto";
import type { PlanningRunResponse, Proposal } from "@gather/contracts";

export type ProposalContext = {
  groupId: string;
  runId: string;
  proposal: Proposal;
};

export type PlanningStore = {
  createRun(
    groupId: string,
    initiatedBy: string,
    activityRequest?: string,
  ): PlanningRunResponse;
  getRun(runId: string): PlanningRunResponse | undefined;
  listProposals(runId: string): Proposal[];
  findProposalContext(proposalId: string): ProposalContext | undefined;
  completeRun(runId: string, proposals: Proposal[]): void;
  markRunFailed(runId: string): void;
};

export class InMemoryPlanningStore implements PlanningStore {
  private runs = new Map<string, PlanningRunResponse>();
  private proposalsByRun = new Map<string, Proposal[]>();
  private proposalIndex = new Map<
    string,
    { runId: string; groupId: string; proposal: Proposal }
  >();

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

  findProposalContext(proposalId: string): ProposalContext | undefined {
    const hit = this.proposalIndex.get(proposalId);
    if (!hit) {
      return undefined;
    }
    return {
      groupId: hit.groupId,
      runId: hit.runId,
      proposal: hit.proposal,
    };
  }

  completeRun(runId: string, proposals: Proposal[]): void {
    const run = this.runs.get(runId);
    if (!run) {
      return;
    }
    const stored = [...proposals];
    this.proposalsByRun.set(runId, stored);
    for (const p of stored) {
      this.proposalIndex.set(p.proposalId, {
        runId,
        groupId: run.groupId,
        proposal: p,
      });
    }
    this.runs.set(runId, { ...run, status: "completed" });
  }

  markRunFailed(runId: string): void {
    const run = this.runs.get(runId);
    if (!run) {
      return;
    }
    const previous = this.proposalsByRun.get(runId) ?? [];
    for (const p of previous) {
      this.proposalIndex.delete(p.proposalId);
    }
    this.proposalsByRun.set(runId, []);
    this.runs.set(runId, { ...run, status: "failed" });
  }
}
