import type {
  CreateGroupRequest,
  GroupInviteResponse,
  GroupMemberResponse,
  GroupResponse,
  JoinInviteResponse,
} from "@gather/contracts";

// Boundary the real API client will implement. Methods mirror SPEC section 6.2:
//   POST /v1/groups, GET /v1/groups/:groupId, POST /v1/groups/:groupId/invites,
//   POST /v1/invites/:token/join, GET /v1/groups/:groupId/members.
// There is no "list my groups" route, so the app keeps the groups it created or joined in state.
export interface GroupClient {
  createGroup(req: CreateGroupRequest): Promise<GroupResponse>;
  getGroup(groupId: string): Promise<GroupResponse>;
  createInvite(groupId: string): Promise<GroupInviteResponse>;
  joinInvite(token: string): Promise<JoinInviteResponse>;
  listMembers(groupId: string): Promise<GroupMemberResponse[]>;
}

// Mobile-local error shape; the contract error schema is not frozen (SPEC section 11).
export type GroupErrorCode = "invalid_name" | "invalid_invite" | "not_found";
export class GroupError extends Error {
  constructor(readonly code: GroupErrorCode) {
    super(code);
    this.name = "GroupError";
  }
}

// Link join only: gather://invite/<token>. Final invitation/QR details are SPEC section 11.
const INVITE_LINK = /^gather:\/\/invite\/([^/?#\s]+)$/;
export function inviteLink(token: string): string {
  return `gather://invite/${token}`;
}
export function parseInviteToken(url: string): string | null {
  const match = INVITE_LINK.exec(url.trim());
  return match ? decodeURIComponent(match[1]) : null;
}

export const MOCK_USER_ID = "user-me";
export const MOCK_SEED_INVITE_TOKEN = "seed-invite";

// In-memory mock. Role strings are placeholders: role values are not approved (SPEC section 11).
// It contains one pre-existing group (reachable via MOCK_SEED_INVITE_TOKEN) so join can be exercised.
export function createMockGroupClient(): GroupClient {
  const now = () => new Date().toISOString();
  let seq = 0;
  const groups = new Map<string, GroupResponse>();
  const members = new Map<string, GroupMemberResponse[]>();
  const invites = new Map<string, GroupInviteResponse>();

  groups.set("group-seed", {
    id: "group-seed",
    name: "Seed Friends",
    createdBy: "user-seed",
    createdAt: "2026-01-01T00:00:00.000Z",
  });
  members.set("group-seed", [{ userId: "user-seed", role: "owner", joinedAt: "2026-01-01T00:00:00.000Z" }]);
  invites.set(MOCK_SEED_INVITE_TOKEN, {
    id: "invite-seed",
    groupId: "group-seed",
    token: MOCK_SEED_INVITE_TOKEN,
    expiresAt: null,
    createdAt: "2026-01-01T00:00:00.000Z",
  });

  const need = (groupId: string) => {
    const g = groups.get(groupId);
    if (!g) throw new GroupError("not_found");
    return g;
  };

  return {
    createGroup: async ({ name }) => {
      const trimmed = name.trim();
      if (trimmed === "") throw new GroupError("invalid_name");
      seq += 1;
      const createdAt = now();
      const group = { id: `group-${seq}`, name: trimmed, createdBy: MOCK_USER_ID, createdAt };
      groups.set(group.id, group);
      members.set(group.id, [{ userId: MOCK_USER_ID, role: "owner", joinedAt: createdAt }]);
      return { ...group };
    },
    getGroup: async (groupId) => ({ ...need(groupId) }),
    createInvite: async (groupId) => {
      need(groupId);
      seq += 1;
      const invite = {
        id: `invite-${seq}`,
        groupId,
        token: `mock-token-${seq}`,
        expiresAt: null,
        createdAt: now(),
      };
      invites.set(invite.token, invite);
      return { ...invite };
    },
    joinInvite: async (token) => {
      const invite = invites.get(token.trim());
      if (!invite) throw new GroupError("invalid_invite");
      const list = members.get(invite.groupId) ?? [];
      let me = list.find((m) => m.userId === MOCK_USER_ID);
      if (!me) {
        me = { userId: MOCK_USER_ID, role: "member", joinedAt: now() };
        members.set(invite.groupId, [...list, me]);
      }
      return { groupId: invite.groupId, userId: me.userId, role: me.role, joinedAt: me.joinedAt };
    },
    listMembers: async (groupId) => {
      need(groupId);
      return (members.get(groupId) ?? []).map((m) => ({ ...m }));
    },
  };
}
