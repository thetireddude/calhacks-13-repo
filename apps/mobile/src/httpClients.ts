import type {
  ConfirmedEventResponse,
  CreatePlanningRunRequest,
  GroupInviteResponse,
  GroupMemberResponse,
  GroupResponse,
  JoinInviteResponse,
  MemberAvailabilityResponse,
  MemberPreferencesResponse,
  PlanningRunProposalsResponse,
  PlanningRunResponse,
  ProposalVetoResponse,
  ProposalVoteResponse,
} from "@gather/contracts";

import { ApiError } from "./apiClient";
import type { createApiClient } from "./apiClient";
import { GroupError } from "./groups";
import type { GroupClient, GroupErrorCode } from "./groups";
import { PlanningError } from "./planning";
import type { PlanningClient, PlanningErrorCode } from "./planning";
import { VotingError } from "./voting";
import type { ProposalVoteStateView, VotingClient, VotingErrorCode } from "./voting";
import { MemberSetupError } from "./memberSetup";
import type { MemberSetupClient, MemberSetupErrorCode } from "./memberSetup";

type Api = Pick<ReturnType<typeof createApiClient>, "request">;

// Real API clients (SPEC section 6.2). Only the HTTP status is mapped; response bodies, tokens and
// emails never reach error messages. POSTs are never retried automatically: the user retries by hand.

// 400 is only produced by POST /v1/groups (invalid_name). Join treats 404 and 410 (expired) as an
// invalid invite; other routes treat 404 as a missing group.
function groupError(e: unknown, ctx: "create" | "join" | "other"): GroupError {
  if (!(e instanceof ApiError)) return new GroupError("server");
  const byStatus: Record<number, GroupErrorCode> = {
    0: "network",
    401: "unauthenticated",
    403: "forbidden",
    404: ctx === "join" ? "invalid_invite" : "not_found",
    410: "invalid_invite",
    400: ctx === "create" ? "invalid_name" : "server",
  };
  return new GroupError(byStatus[e.status] ?? "server");
}

async function groupCall<T>(ctx: "create" | "join" | "other", call: () => Promise<T>): Promise<T> {
  try {
    return await call();
  } catch (e) {
    throw groupError(e, ctx);
  }
}

const seg = encodeURIComponent;

export function createHttpGroupClient(api: Api): GroupClient {
  return {
    listGroups: () =>
      groupCall("other", async () => (await api.request<{ groups: GroupResponse[] }>("/v1/groups")).groups),
    createGroup: (req) => groupCall("create", () => api.request<GroupResponse>("/v1/groups", { method: "POST", body: req })),
    getGroup: (id) => groupCall("other", () => api.request<GroupResponse>(`/v1/groups/${seg(id)}`)),
    createInvite: (id) =>
      groupCall("other", () => api.request<GroupInviteResponse>(`/v1/groups/${seg(id)}/invites`, { method: "POST" })),
    joinInvite: (token) =>
      groupCall("join", () =>
        api.request<JoinInviteResponse>(`/v1/invites/${seg(token.trim())}/join`, { method: "POST" }),
      ),
    listMembers: (id) =>
      groupCall("other", async () =>
        (await api.request<{ members: GroupMemberResponse[] }>(`/v1/groups/${seg(id)}/members`)).members,
      ),
  };
}

function setupError(e: unknown): MemberSetupError {
  if (!(e instanceof ApiError)) return new MemberSetupError("server");
  const byStatus: Record<number, MemberSetupErrorCode> = { 0: "network", 400: "invalid", 401: "unauthenticated" };
  return new MemberSetupError(byStatus[e.status] ?? "server");
}

async function setupCall<T>(call: () => Promise<T>): Promise<T> {
  try {
    return await call();
  } catch (e) {
    throw setupError(e);
  }
}

// Only the signed-in user's own /v1/me/* data is ever requested.
export function createHttpMemberSetupClient(api: Api): MemberSetupClient {
  return {
    getPreferences: () => setupCall(() => api.request<MemberPreferencesResponse>("/v1/me/preferences")),
    putPreferences: (req) =>
      setupCall(() => api.request<MemberPreferencesResponse>("/v1/me/preferences", { method: "PUT", body: req })),
    getAvailability: () => setupCall(() => api.request<MemberAvailabilityResponse>("/v1/me/availability")),
    putAvailability: (req) =>
      setupCall(() => api.request<MemberAvailabilityResponse>("/v1/me/availability", { method: "PUT", body: req })),
  };
}

async function planningCall<T>(call: () => Promise<T>): Promise<T> {
  try {
    return await call();
  } catch (e) {
    if (!(e instanceof ApiError)) throw new PlanningError("server");
    const byStatus: Record<number, PlanningErrorCode> = {
      0: "network",
      400: "invalid",
      401: "unauthenticated",
      403: "forbidden",
      404: "not_found",
      409: "conflict",
    };
    throw new PlanningError(byStatus[e.status] ?? "server");
  }
}

// POST /v1/groups/:groupId/planning-runs creates the run AND generates proposals synchronously (the API
// calls the planner inside the request), so no separate /generate call is needed to start. The response
// is the run in its resulting state ("completed" or "failed"). retryRun re-runs the same run in place via
// POST /generate (409 if it already completed). Neither POST is retried automatically.
export function createHttpPlanningClient(api: Api): PlanningClient {
  return {
    createRun: (groupId: string, req: CreatePlanningRunRequest) =>
      planningCall(() =>
        api.request<PlanningRunResponse>(`/v1/groups/${seg(groupId)}/planning-runs`, { method: "POST", body: req }),
      ),
    getRun: (runId) => planningCall(() => api.request<PlanningRunResponse>(`/v1/planning-runs/${seg(runId)}`)),
    getProposals: (runId) =>
      planningCall(() => api.request<PlanningRunProposalsResponse>(`/v1/planning-runs/${seg(runId)}/proposals`)),
    retryRun: (runId) =>
      planningCall(() =>
        api.request<PlanningRunResponse>(`/v1/planning-runs/${seg(runId)}/generate`, { method: "POST" }),
      ),
  };
}

function votingError(e: unknown): VotingError {
  if (!(e instanceof ApiError)) return new VotingError("server");
  const byStatus: Record<number, VotingErrorCode> = {
    0: "network",
    400: "invalid",
    401: "unauthenticated",
    403: "forbidden",
    404: "not_found",
  };
  return new VotingError(byStatus[e.status] ?? "server");
}

async function votingCall<T>(call: () => Promise<T>): Promise<T> {
  try {
    return await call();
  } catch (e) {
    throw votingError(e);
  }
}

// Real: PUT vote, POST veto, GET confirmed-event (404 = no event yet, the API's "none" answer).
// Not real (no API route yet, SPEC section 9 requests): getVoteState and listNotifications.
// - getVoteState: the API exposes no tallies, deadline or eligibility, so none are invented or computed.
//   The view carries only what the API itself returned to this user in this session (own vote / own veto),
//   and `voteAllowed`/`vetoAllowed` are true only so the controls are reachable: the backend remains the
//   authority and rejects disallowed actions (shown as an error).
// - listNotifications: always empty until a notifications route exists; fixture data is never shown.
export function createHttpVotingClient(api: Api): VotingClient {
  const mine = new Map<string, Pick<ProposalVoteStateView, "myChoice" | "myVeto">>();
  return {
    getVoteState: async (proposalId) => ({
      proposalId,
      status: "open",
      voteAllowed: true,
      vetoAllowed: true,
      ...mine.get(proposalId),
    }),
    putVote: async (proposalId, req) => {
      const res = await votingCall(() =>
        api.request<ProposalVoteResponse>(`/v1/proposals/${seg(proposalId)}/vote`, { method: "PUT", body: req }),
      );
      mine.set(proposalId, { ...mine.get(proposalId), myChoice: res.choice });
      return res;
    },
    veto: async (proposalId) => {
      const res = await votingCall(() =>
        api.request<ProposalVetoResponse>(`/v1/proposals/${seg(proposalId)}/veto`, { method: "POST" }),
      );
      mine.set(proposalId, { ...mine.get(proposalId), myVeto: true });
      return res;
    },
    getConfirmedEvent: async (groupId) => {
      try {
        const event = await api.request<ConfirmedEventResponse>(`/v1/groups/${seg(groupId)}/confirmed-event`);
        return { status: "confirmed", event };
      } catch (e) {
        if (e instanceof ApiError && e.status === 404) return { status: "none" };
        throw votingError(e);
      }
    },
    listNotifications: async () => [],
    realBackend: true,
  };
}
