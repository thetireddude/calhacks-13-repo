import { randomUUID } from "node:crypto";
import type {
  ConfirmedEventResponse,
  ProposalVetoResponse,
  ProposalVoteResponse,
  VoteChoice,
} from "@gather/contracts";

export type VotingStore = {
  upsertVote(
    proposalId: string,
    userId: string,
    choice: VoteChoice,
  ): Promise<ProposalVoteResponse>;
  getVote(
    proposalId: string,
    userId: string,
  ): Promise<ProposalVoteResponse | undefined>;
  countApprovals(proposalId: string): Promise<number>;
  recordVeto(
    proposalId: string,
    userId: string,
  ): Promise<ProposalVetoResponse>;
  getVeto(
    proposalId: string,
    userId: string,
  ): Promise<ProposalVetoResponse | undefined>;
  getConfirmedEvent(
    groupId: string,
  ): Promise<ConfirmedEventResponse | undefined>;
  getConfirmedEventById(
    eventId: string,
  ): Promise<ConfirmedEventResponse | undefined>;
  /**
   * Gate 1 stub (SPEC §11): confirm when approve votes >= ceil(memberCount / 2).
   * Idempotent: at most one confirmed event per group.
   */
  tryConfirmFromMajority(input: {
    groupId: string;
    proposalId: string;
    planningRunId: string;
    summary: string;
    memberCount: number;
  }): Promise<ConfirmedEventResponse | undefined>;
};

type VoteKey = `${string}:${string}`;

export class InMemoryVotingStore implements VotingStore {
  private votes = new Map<VoteKey, ProposalVoteResponse>();
  private vetoes = new Map<VoteKey, ProposalVetoResponse>();
  private confirmedByGroup = new Map<string, ConfirmedEventResponse>();

  async upsertVote(
    proposalId: string,
    userId: string,
    choice: VoteChoice,
  ): Promise<ProposalVoteResponse> {
    const record: ProposalVoteResponse = {
      proposalId,
      userId,
      choice,
      updatedAt: new Date().toISOString(),
    };
    this.votes.set(`${proposalId}:${userId}`, record);
    return record;
  }

  async getVote(
    proposalId: string,
    userId: string,
  ): Promise<ProposalVoteResponse | undefined> {
    return this.votes.get(`${proposalId}:${userId}`);
  }

  async countApprovals(proposalId: string): Promise<number> {
    return this.countApprovalsSync(proposalId);
  }

  async recordVeto(
    proposalId: string,
    userId: string,
  ): Promise<ProposalVetoResponse> {
    const existing = this.vetoes.get(`${proposalId}:${userId}`);
    if (existing) {
      return existing;
    }
    const record: ProposalVetoResponse = {
      proposalId,
      userId,
      vetoed: true,
      createdAt: new Date().toISOString(),
    };
    this.vetoes.set(`${proposalId}:${userId}`, record);
    return record;
  }

  async getVeto(
    proposalId: string,
    userId: string,
  ): Promise<ProposalVetoResponse | undefined> {
    return this.vetoes.get(`${proposalId}:${userId}`);
  }

  async getConfirmedEvent(
    groupId: string,
  ): Promise<ConfirmedEventResponse | undefined> {
    return this.confirmedByGroup.get(groupId);
  }

  async getConfirmedEventById(
    eventId: string,
  ): Promise<ConfirmedEventResponse | undefined> {
    for (const event of this.confirmedByGroup.values()) {
      if (event.id === eventId) {
        return event;
      }
    }
    return undefined;
  }

  async tryConfirmFromMajority(input: {
    groupId: string;
    proposalId: string;
    planningRunId: string;
    summary: string;
    memberCount: number;
  }): Promise<ConfirmedEventResponse | undefined> {
    // Stay synchronous until the write so concurrent callers cannot duplicate.
    const existing = this.confirmedByGroup.get(input.groupId);
    if (existing) {
      return existing;
    }

    const threshold = Math.ceil(input.memberCount / 2);
    if (this.countApprovalsSync(input.proposalId) < threshold) {
      return undefined;
    }

    const raceCheck = this.confirmedByGroup.get(input.groupId);
    if (raceCheck) {
      return raceCheck;
    }

    const confirmed: ConfirmedEventResponse = {
      id: randomUUID(),
      groupId: input.groupId,
      proposalId: input.proposalId,
      planningRunId: input.planningRunId,
      summary: input.summary,
      confirmedAt: new Date().toISOString(),
    };
    this.confirmedByGroup.set(input.groupId, confirmed);
    return confirmed;
  }

  private countApprovalsSync(proposalId: string): number {
    let count = 0;
    for (const vote of this.votes.values()) {
      if (vote.proposalId === proposalId && vote.choice === "approve") {
        count += 1;
      }
    }
    return count;
  }
}
