/** Group and membership DTOs (SPEC §6.2); additive stub until contract freeze. */

export type CreateGroupRequest = {
  name: string;
};

export type GroupResponse = {
  id: string;
  name: string;
  createdBy: string;
  createdAt: string;
};

export type GroupInviteResponse = {
  id: string;
  groupId: string;
  token: string;
  expiresAt: string | null;
  createdAt: string;
};

export type GroupMemberResponse = {
  userId: string;
  role: string;
  joinedAt: string;
};

export type JoinInviteResponse = {
  groupId: string;
  userId: string;
  role: string;
  joinedAt: string;
};

/** Config only; weeklyEnabled does not trigger auto-planning (SPEC §11). */
export type GroupSchedule = {
  timezone: string;
  weeklyEnabled: boolean;
};

export type MeProfileStub = {
  displayName: string | null;
};

export type MeResponse = {
  id: string;
  profile: MeProfileStub;
};
