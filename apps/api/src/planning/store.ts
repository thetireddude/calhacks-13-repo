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
  ): Promise<PlanningRunResponse>;
  getRun(runId: string): Promise<PlanningRunResponse | undefined>;
  listProposals(runId: string): Promise<Proposal[]>;
  findProposalContext(proposalId: string): Promise<ProposalContext | undefined>;
  completeRun(runId: string, proposals: Proposal[]): Promise<void>;
  markRunFailed(runId: string): Promise<void>;
};

export class InMemoryPlanningStore implements PlanningStore {
  private runs = new Map<string, PlanningRunResponse>();
  private proposalsByRun = new Map<string, Proposal[]>();
  private proposalIndex = new Map<
    string,
    { runId: string; groupId: string; proposal: Proposal }
  >();

  async createRun(
    groupId: string,
    initiatedBy: string,
    activityRequest?: string,
  ): Promise<PlanningRunResponse> {
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

  async getRun(runId: string): Promise<PlanningRunResponse | undefined> {
    return this.runs.get(runId);
  }

  async listProposals(runId: string): Promise<Proposal[]> {
    if (!this.runs.has(runId)) {
      return [];
    }
    return [...(this.proposalsByRun.get(runId) ?? [])];
  }

  async findProposalContext(
    proposalId: string,
  ): Promise<ProposalContext | undefined> {
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

  async completeRun(runId: string, proposals: Proposal[]): Promise<void> {
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

  async markRunFailed(runId: string): Promise<void> {
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
