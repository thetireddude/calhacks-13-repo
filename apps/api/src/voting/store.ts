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
  ): ProposalVoteResponse;
  getVote(proposalId: string, userId: string): ProposalVoteResponse | undefined;
  countApprovals(proposalId: string): number;
  recordVeto(proposalId: string, userId: string): ProposalVetoResponse;
  getVeto(proposalId: string, userId: string): ProposalVetoResponse | undefined;
  getConfirmedEvent(groupId: string): ConfirmedEventResponse | undefined;
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
  }): ConfirmedEventResponse | undefined;
};

type VoteKey = `${string}:${string}`;

export class InMemoryVotingStore implements VotingStore {
  private votes = new Map<VoteKey, ProposalVoteResponse>();
  private vetoes = new Map<VoteKey, ProposalVetoResponse>();
  private confirmedByGroup = new Map<string, ConfirmedEventResponse>();

  upsertVote(
    proposalId: string,
    userId: string,
    choice: VoteChoice,
  ): ProposalVoteResponse {
    const record: ProposalVoteResponse = {
      proposalId,
      userId,
      choice,
      updatedAt: new Date().toISOString(),
    };
    this.votes.set(`${proposalId}:${userId}`, record);
    return record;
  }

  getVote(
    proposalId: string,
    userId: string,
  ): ProposalVoteResponse | undefined {
    return this.votes.get(`${proposalId}:${userId}`);
  }

  countApprovals(proposalId: string): number {
    let count = 0;
    for (const vote of this.votes.values()) {
      if (vote.proposalId === proposalId && vote.choice === "approve") {
        count += 1;
      }
    }
    return count;
  }

  recordVeto(proposalId: string, userId: string): ProposalVetoResponse {
    const existing = this.getVeto(proposalId, userId);
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

  getVeto(
    proposalId: string,
    userId: string,
  ): ProposalVetoResponse | undefined {
    return this.vetoes.get(`${proposalId}:${userId}`);
  }

  getConfirmedEvent(groupId: string): ConfirmedEventResponse | undefined {
    return this.confirmedByGroup.get(groupId);
  }

  tryConfirmFromMajority(input: {
    groupId: string;
    proposalId: string;
    planningRunId: string;
    summary: string;
    memberCount: number;
  }): ConfirmedEventResponse | undefined {
    const existing = this.confirmedByGroup.get(input.groupId);
    if (existing) {
      return existing;
    }

    const threshold = Math.ceil(input.memberCount / 2);
    if (this.countApprovals(input.proposalId) < threshold) {
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
}
