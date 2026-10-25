import { randomBytes, randomUUID } from "node:crypto";
import type {
  GroupInviteResponse,
  GroupMemberResponse,
  GroupResponse,
} from "@gather/contracts";

export type GroupsStore = {
  createGroup(name: string, createdBy: string): Promise<GroupResponse>;
  getGroup(groupId: string): Promise<GroupResponse | undefined>;
  isMember(groupId: string, userId: string): Promise<boolean>;
  listMembers(groupId: string): Promise<GroupMemberResponse[]>;
  createInvite(
    groupId: string,
    createdBy: string,
    expiresAt?: string | null,
  ): Promise<GroupInviteResponse>;
  getInviteByToken(token: string): Promise<GroupInviteResponse | undefined>;
  joinGroup(groupId: string, userId: string): Promise<GroupMemberResponse>;
};

type StoredInvite = GroupInviteResponse & { createdBy: string };

export class InMemoryGroupsStore implements GroupsStore {
  private groups = new Map<string, GroupResponse>();
  private memberships = new Map<string, GroupMemberResponse[]>();
  private invites = new Map<string, StoredInvite>();

  async createGroup(name: string, createdBy: string): Promise<GroupResponse> {
    const group: GroupResponse = {
      id: randomUUID(),
      name,
      createdBy,
      createdAt: new Date().toISOString(),
    };
    this.groups.set(group.id, group);
    this.memberships.set(group.id, []);
    await this.joinGroup(group.id, createdBy);
    const members = this.memberships.get(group.id)!;
    const owner = members.find((m) => m.userId === createdBy);
    if (owner) {
      owner.role = "owner";
    }
    return group;
  }

  async getGroup(groupId: string): Promise<GroupResponse | undefined> {
    return this.groups.get(groupId);
  }

  async isMember(groupId: string, userId: string): Promise<boolean> {
    return (await this.listMembers(groupId)).some((m) => m.userId === userId);
  }

  async listMembers(groupId: string): Promise<GroupMemberResponse[]> {
    return [...(this.memberships.get(groupId) ?? [])];
  }

  async createInvite(
    groupId: string,
    createdBy: string,
    expiresAt: string | null = null,
  ): Promise<GroupInviteResponse> {
    const token = randomBytes(24).toString("base64url");
    const invite: StoredInvite = {
      id: randomUUID(),
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

  async getInviteByToken(
    token: string,
  ): Promise<GroupInviteResponse | undefined> {
    const invite = this.invites.get(token);
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

  async joinGroup(
    groupId: string,
    userId: string,
  ): Promise<GroupMemberResponse> {
    const members = this.memberships.get(groupId) ?? [];
    const existing = members.find((m) => m.userId === userId);
    if (existing) {
      return existing;
    }
    const membership: GroupMemberResponse = {
      userId,
      role: "member",
      joinedAt: new Date().toISOString(),
    };
    members.push(membership);
    this.memberships.set(groupId, members);
    return membership;
  }
}
