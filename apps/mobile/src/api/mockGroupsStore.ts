import type {
  GroupInviteResponse,
  GroupMemberResponse,
  GroupResponse,
} from '@gather/contracts';

type StoredInvite = GroupInviteResponse & { createdBy: string };

function randomId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 11)}`;
}

function randomToken(): string {
  return randomId().replace(/-/g, '') + randomId().replace(/-/g, '');
}

export class MockGroupsStore {
  private groups = new Map<string, GroupResponse>();
  private memberships = new Map<string, GroupMemberResponse[]>();
  private invites = new Map<string, StoredInvite>();

  createGroup(name: string, createdBy: string): GroupResponse {
    const group: GroupResponse = {
      id: randomId(),
      name,
      createdBy,
      createdAt: new Date().toISOString(),
    };
    this.groups.set(group.id, group);
    this.memberships.set(group.id, []);
    this.joinGroup(group.id, createdBy);
    const members = this.memberships.get(group.id)!;
    const owner = members.find((m) => m.userId === createdBy);
    if (owner) {
      owner.role = 'owner';
    }
    return group;
  }

  getGroup(groupId: string): GroupResponse | undefined {
    return this.groups.get(groupId);
  }

  isMember(groupId: string, userId: string): boolean {
    return this.listMembers(groupId).some((m) => m.userId === userId);
  }

  listMembers(groupId: string): GroupMemberResponse[] {
    return [...(this.memberships.get(groupId) ?? [])];
  }

  listGroupsForUser(userId: string): GroupResponse[] {
    const result: GroupResponse[] = [];
    for (const group of this.groups.values()) {
      if (this.isMember(group.id, userId)) {
        result.push(group);
      }
    }
    return result.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  createInvite(
    groupId: string,
    createdBy: string,
    expiresAt: string | null = null,
  ): GroupInviteResponse {
    const token = randomToken();
    const invite: StoredInvite = {
      id: randomId(),
      groupId,
      token,
      expiresAt,
      createdAt: new Date().toISOString(),
      createdBy,
    };
    this.invites.set(token, invite);
    return {
      id: invite.id,
      groupId: invite.groupId,
      token: invite.token,
      expiresAt: invite.expiresAt,
      createdAt: invite.createdAt,
    };
  }

  getInviteByToken(token: string): GroupInviteResponse | undefined {
    const invite = this.invites.get(token.trim());
    if (!invite) {
      return undefined;
    }
    return {
      id: invite.id,
      groupId: invite.groupId,
      token: invite.token,
      expiresAt: invite.expiresAt,
      createdAt: invite.createdAt,
    };
  }

  joinGroup(groupId: string, userId: string): GroupMemberResponse {
    const members = this.memberships.get(groupId) ?? [];
    const existing = members.find((m) => m.userId === userId);
    if (existing) {
      return existing;
    }
    const membership: GroupMemberResponse = {
      userId,
      role: 'member',
      joinedAt: new Date().toISOString(),
    };
    members.push(membership);
    this.memberships.set(groupId, members);
    return membership;
  }

  reset(): void {
    this.groups.clear();
    this.memberships.clear();
    this.invites.clear();
  }
}

export const mockGroupsStore = new MockGroupsStore();

export function inviteExpired(expiresAt: string | null): boolean {
  if (!expiresAt) {
    return false;
  }
  return Date.parse(expiresAt) <= Date.now();
}
