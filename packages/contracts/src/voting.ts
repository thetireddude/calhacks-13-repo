/** Voting and confirmation API DTOs (SPEC §6.2). Choice enums are Gate 1 stubs (SPEC §11). */

/** Stub vote choices until SPEC §11 freeze; explicit veto uses POST `/veto`, not this body. */
export type VoteChoice = "approve" | "cant_make_it";

export type PutProposalVoteRequest = {
  choice: VoteChoice;
};

export type ProposalVoteResponse = {
  proposalId: string;
  userId: string;
  choice: VoteChoice;
  updatedAt: string;
};

export type ProposalVetoResponse = {
  proposalId: string;
  userId: string;
  vetoed: true;
  createdAt: string;
};

export type ConfirmedEventResponse = {
  id: string;
  groupId: string;
  proposalId: string;
  planningRunId: string;
  summary: string;
  confirmedAt: string;
};
