/** In-memory mock group routes until real API wiring (DEV1-004). */

import type {
  CreateGroupRequest,
  GroupInviteResponse,
  GroupResponse,
  JoinInviteResponse,
} from '@gather/contracts';

import { getMockAuthSession } from './mockAuth';
import { inviteExpired, mockGroupsStore } from './mockGroupsStore';

const REQUEST_DELAY_MS = 400;

export class MockGroupsError extends Error {
  readonly code:
    | 'unauthorized'
    | 'invalid_name'
    | 'not_found'
    | 'forbidden'
    | 'invite_expired';

  constructor(code: MockGroupsError['code'], message: string) {
    super(message);
    this.code = code;
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function requireUserId(): string {
  const session = getMockAuthSession();
  if (!session) {
    throw new MockGroupsError('unauthorized', 'Sign in to manage groups.');
  }
  return session.userId;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/** Simulates POST /v1/groups */
export async function createGroup(body: CreateGroupRequest): Promise<GroupResponse> {
  await delay(REQUEST_DELAY_MS);
  const userId = requireUserId();
  if (!isNonEmptyString(body?.name)) {
    throw new MockGroupsError('invalid_name', 'Enter a group name.');
  }
  return mockGroupsStore.createGroup(body.name.trim(), userId);
}

/** Lists groups the signed-in user belongs to (mock convenience; no dedicated REST route yet). */
export async function listMyGroups(): Promise<GroupResponse[]> {
  await delay(REQUEST_DELAY_MS);
  const userId = requireUserId();
  return mockGroupsStore.listGroupsForUser(userId);
}

/** Simulates POST /v1/groups/:groupId/invites */
export async function createGroupInvite(groupId: string): Promise<GroupInviteResponse> {
  await delay(REQUEST_DELAY_MS);
  const userId = requireUserId();
  if (!mockGroupsStore.getGroup(groupId)) {
    throw new MockGroupsError('not_found', 'Group not found.');
  }
  if (!mockGroupsStore.isMember(groupId, userId)) {
    throw new MockGroupsError('forbidden', 'You are not a member of this group.');
  }
  return mockGroupsStore.createInvite(groupId, userId);
}

/** Simulates POST /v1/invites/:token/join */
export async function joinGroupInvite(token: string): Promise<JoinInviteResponse> {
  await delay(REQUEST_DELAY_MS);
  const userId = requireUserId();
  const invite = mockGroupsStore.getInviteByToken(token);
  if (!invite || !mockGroupsStore.getGroup(invite.groupId)) {
    throw new MockGroupsError('not_found', 'Invite not found.');
  }
  if (inviteExpired(invite.expiresAt)) {
    throw new MockGroupsError('invite_expired', 'This invite has expired.');
  }
  const membership = mockGroupsStore.joinGroup(invite.groupId, userId);
  return {
    groupId: invite.groupId,
    userId: membership.userId,
    role: membership.role,
    joinedAt: membership.joinedAt,
  };
}

export function clearMockGroupsStore(): void {
  mockGroupsStore.reset();
}
