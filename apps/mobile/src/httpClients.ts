import type {
  GroupInviteResponse,
  GroupMemberResponse,
  GroupResponse,
  JoinInviteResponse,
  MemberAvailabilityResponse,
  MemberPreferencesResponse,
} from "@gather/contracts";

import { ApiError } from "./apiClient";
import type { createApiClient } from "./apiClient";
import { GroupError } from "./groups";
import type { GroupClient, GroupErrorCode } from "./groups";
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

export function createHttpGroupClient(api: Api): GroupClient {
  const seg = encodeURIComponent;
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
