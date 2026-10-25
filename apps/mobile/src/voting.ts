import type {
  ConfirmedEventResponse,
  ProposalVetoResponse,
  ProposalVoteResponse,
  PutProposalVoteRequest,
} from "@gather/contracts";

// ---------------------------------------------------------------------------------------------
// Mobile-local stub view types. Every type below is a mobile-local stub, pending SPEC section 9 / 11
// approval: packages/contracts has no DTO for any of them. The UI only renders what the backend
// (here: the mock) provides; mobile never computes tallies, majority, deadlines, veto scope or
// confirmation. See the DEV1-007 handoff for the SPEC section 9 change requests these imply.
// ---------------------------------------------------------------------------------------------

// mobile-local stub, pending SPEC §9/§11 approval: vote state for one proposal.
// `status` strings are stubs; the UI knows "open", "vetoed", "revision", "revote", "confirmed",
// "cancelled" and shows anything else neutrally. Counts are backend aggregates only (never per member).
export type ProposalVoteStateView = {
  proposalId: string;
  status: string;
  // Optional: the real API returns no tallies (no route), so they are omitted rather than computed.
  approveCount?: number;
  cantMakeItCount?: number;
  // mobile-local stub, pending SPEC §9 approval: backend says whether vote controls are shown at all.
  // The UI never infers this from `status`, which is display-only.
  voteAllowed: boolean;
  // Backend decides whether this user may veto (SPEC section 11); the UI never infers it.
  vetoAllowed: boolean;
  // ISO string supplied by the backend; shown as given, never enforced client-side.
  deadline?: string;
  // The caller's own latest vote, if any.
  myChoice?: "approve" | "cant_make_it";
  // The caller's own veto as acknowledged by the backend response; says nothing about the proposal's fate.
  myVeto?: boolean;
};

// mobile-local stub, pending SPEC §9/§11 approval: confirmed-event envelope with cancellation state.
export type ConfirmedEventView =
  | { status: "none" }
  | { status: "confirmed" | "cancelled"; event: ConfirmedEventResponse };

// mobile-local stub, pending SPEC §9/§11 approval: in-app notification item (payload format not frozen).
export type NotificationItemView = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
};

// mobile-local stub, pending SPEC §9/§11 approval: ICS result; serialization owner is SPEC section 11.
export type IcsExportResult = { filename: string };

export interface IcsClient {
  exportIcs(eventId: string): Promise<IcsExportResult>;
}

// Boundary the real API client will implement (SPEC section 6.2): PUT /v1/proposals/:id/vote,
// POST /v1/proposals/:id/veto (a separate route, never a vote choice),
// GET /v1/groups/:groupId/confirmed-event, GET /v1/me/notifications.
// getVoteState has no contract route yet (mobile-local stub).
export type VotingErrorCode = "network" | "unauthenticated" | "forbidden" | "not_found" | "invalid" | "server";
export class VotingError extends Error {
  constructor(readonly code: VotingErrorCode) {
    super(code);
    this.name = "VotingError";
  }
}

export interface VotingClient {
  getVoteState(proposalId: string): Promise<ProposalVoteStateView>;
  putVote(proposalId: string, req: PutProposalVoteRequest): Promise<ProposalVoteResponse>;
  veto(proposalId: string): Promise<ProposalVetoResponse>;
  getConfirmedEvent(groupId: string): Promise<ConfirmedEventView>;
  listNotifications(): Promise<NotificationItemView[]>;
}

export type MockVoteScenario = "open" | "vetoed" | "revision" | "revote" | "confirmed" | "cancelled" | "noVeto";
export type MockEventScenario = "none" | "confirmed" | "cancelled";

export const FIXTURE_EVENT: ConfirmedEventResponse = {
  id: "event-1",
  groupId: "group-1",
  proposalId: "proposal-1",
  planningRunId: "run-1",
  summary: "Saturday hike at the ridge",
  confirmedAt: "2026-11-01T18:00:00.000Z",
};

export const FIXTURE_NOTIFICATIONS: NotificationItemView[] = [
  { id: "n1", title: "New proposals", body: "Proposals are ready to vote on.", createdAt: "2026-10-30T10:00:00.000Z" },
  { id: "n2", title: "Event confirmed", body: "Your group confirmed a plan.", createdAt: "2026-11-01T18:00:00.000Z" },
];

export const FIXTURE_DEADLINE = "2026-11-02T20:00:00.000Z";

function stateFor(scenario: MockVoteScenario, proposalId: string): ProposalVoteStateView {
  const base = {
    proposalId,
    approveCount: 3,
    cantMakeItCount: 1,
    vetoAllowed: true,
    voteAllowed: scenario === "open" || scenario === "noVeto" || scenario === "revote",
    deadline: FIXTURE_DEADLINE,
  };
  if (scenario === "noVeto") return { ...base, status: "open", vetoAllowed: false };
  return { ...base, status: scenario };
}

export type MockVotingOptions = {
  vote?: MockVoteScenario;
  event?: MockEventScenario;
  notifications?: NotificationItemView[];
};

// In-memory mock backend. Aggregate counts and status are fixed per scenario; it only remembers the
// caller's own latest choice. It does not tally, apply deadlines or decide veto effects.
export function createMockVotingClient(options: MockVotingOptions = {}): VotingClient {
  const scenario = options.vote ?? "open";
  const eventScenario = options.event ?? "confirmed";
  const mine = new Map<string, "approve" | "cant_make_it">();
  return {
    getVoteState: async (proposalId) => {
      const choice = mine.get(proposalId);
      return { ...stateFor(scenario, proposalId), ...(choice ? { myChoice: choice } : {}) };
    },
    putVote: async (proposalId, req) => {
      mine.set(proposalId, req.choice);
      return { proposalId, userId: "user-me", choice: req.choice, updatedAt: new Date().toISOString() };
    },
    veto: async (proposalId) => ({
      proposalId,
      userId: "user-me",
      vetoed: true,
      createdAt: new Date().toISOString(),
    }),
    getConfirmedEvent: async (groupId) =>
      eventScenario === "none" ? { status: "none" } : { status: eventScenario, event: { ...FIXTURE_EVENT, groupId } },
    listNotifications: async () => (options.notifications ?? FIXTURE_NOTIFICATIONS).map((n) => ({ ...n })),
  };
}

export function createMockIcsClient(): IcsClient {
  return { exportIcs: async (eventId) => ({ filename: `${eventId}.ics` }) };
}
