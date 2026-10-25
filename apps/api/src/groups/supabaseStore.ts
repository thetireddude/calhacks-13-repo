import { randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  GroupInviteResponse,
  GroupMemberResponse,
  GroupResponse,
  GroupSchedule,
} from "@gather/contracts";
import { DEFAULT_GROUP_SCHEDULE, type GroupsStore } from "./store.js";

type GroupRow = {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
};

type MembershipRow = {
  user_id: string;
  role: string;
  joined_at: string;
};

type InviteRow = {
  id: string;
  group_id: string;
  token: string;
  expires_at: string | null;
  created_at: string;
};

type ScheduleRow = {
  timezone: string;
  weekly_enabled: boolean;
};

function toIsoTimestamp(value: string): string {
  return new Date(value).toISOString();
}

function mapGroup(row: GroupRow): GroupResponse {
  return {
    id: row.id,
    name: row.name,
    createdBy: row.created_by,
    createdAt: toIsoTimestamp(row.created_at),
  };
}

function mapMember(row: MembershipRow): GroupMemberResponse {
  return {
    userId: row.user_id,
    role: row.role,
    joinedAt: toIsoTimestamp(row.joined_at),
  };
}

function mapInvite(row: InviteRow): GroupInviteResponse {
  return {
    id: row.id,
    groupId: row.group_id,
    token: row.token,
    expiresAt: row.expires_at ? toIsoTimestamp(row.expires_at) : null,
    createdAt: toIsoTimestamp(row.created_at),
  };
}

function mapSchedule(row: ScheduleRow): GroupSchedule {
  return {
    timezone: row.timezone,
    weeklyEnabled: row.weekly_enabled,
  };
}

async function ensureProfile(
  client: SupabaseClient,
  userId: string,
): Promise<void> {
  const { error } = await client.from("profiles").upsert(
    { id: userId },
    { onConflict: "id", ignoreDuplicates: true },
  );
  if (error) {
    throw new Error(`profiles upsert failed: ${error.message}`);
  }
}

export class SupabaseGroupsStore implements GroupsStore {
  constructor(private readonly client: SupabaseClient) {}

  async createGroup(name: string, createdBy: string): Promise<GroupResponse> {
    await ensureProfile(this.client, createdBy);

    const { data: groupRow, error: groupError } = await this.client
      .from("groups")
      .insert({ name, created_by: createdBy })
      .select("id, name, created_by, created_at")
      .single();

    if (groupError || !groupRow) {
      throw new Error(
        `create group failed: ${groupError?.message ?? "no row returned"}`,
      );
    }

    const { error: memberError } = await this.client
      .from("group_memberships")
      .insert({
        group_id: groupRow.id,
        user_id: createdBy,
        role: "owner",
      });

    if (memberError) {
      throw new Error(`create owner membership failed: ${memberError.message}`);
    }

    return mapGroup(groupRow as GroupRow);
  }

  async getGroup(groupId: string): Promise<GroupResponse | undefined> {
    const { data, error } = await this.client
      .from("groups")
      .select("id, name, created_by, created_at")
      .eq("id", groupId)
      .maybeSingle();

    if (error) {
      throw new Error(`get group failed: ${error.message}`);
    }
    if (!data) {
      return undefined;
    }
    return mapGroup(data as GroupRow);
  }

  async listGroupsForUser(userId: string): Promise<GroupResponse[]> {
    const { data: memberships, error: membershipError } = await this.client
      .from("group_memberships")
      .select("group_id")
      .eq("user_id", userId);

    if (membershipError) {
      throw new Error(`list user memberships failed: ${membershipError.message}`);
    }

    const groupIds = (memberships ?? []).map(
      (row) => (row as { group_id: string }).group_id,
    );
    if (groupIds.length === 0) {
      return [];
    }

    const { data, error } = await this.client
      .from("groups")
      .select("id, name, created_by, created_at")
      .in("id", groupIds);

    if (error) {
      throw new Error(`list groups for user failed: ${error.message}`);
    }

    return (data ?? []).map((row) => mapGroup(row as GroupRow));
  }

  async isMember(groupId: string, userId: string): Promise<boolean> {
    const { data, error } = await this.client
      .from("group_memberships")
      .select("user_id")
      .eq("group_id", groupId)
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      throw new Error(`membership lookup failed: ${error.message}`);
    }
    return data != null;
  }

  async listMembers(groupId: string): Promise<GroupMemberResponse[]> {
    const { data, error } = await this.client
      .from("group_memberships")
      .select("user_id, role, joined_at")
      .eq("group_id", groupId);

    if (error) {
      throw new Error(`list members failed: ${error.message}`);
    }

    return (data ?? []).map((row) => mapMember(row as MembershipRow));
  }

  async createInvite(
    groupId: string,
    createdBy: string,
    expiresAt: string | null = null,
  ): Promise<GroupInviteResponse> {
    await ensureProfile(this.client, createdBy);
    const token = randomBytes(24).toString("base64url");

    const { data, error } = await this.client
      .from("group_invitations")
      .insert({
        group_id: groupId,
        token,
        created_by: createdBy,
        expires_at: expiresAt,
      })
      .select("id, group_id, token, expires_at, created_at")
      .single();

    if (error || !data) {
      throw new Error(
        `create invite failed: ${error?.message ?? "no row returned"}`,
      );
    }

    return mapInvite(data as InviteRow);
  }

  async getInviteByToken(
    token: string,
  ): Promise<GroupInviteResponse | undefined> {
    const { data, error } = await this.client
      .from("group_invitations")
      .select("id, group_id, token, expires_at, created_at")
      .eq("token", token)
      .maybeSingle();

    if (error) {
      throw new Error(`get invite failed: ${error.message}`);
    }
    if (!data) {
      return undefined;
    }
    return mapInvite(data as InviteRow);
  }

  async joinGroup(
    groupId: string,
    userId: string,
  ): Promise<GroupMemberResponse> {
    const { data: existing, error: existingError } = await this.client
      .from("group_memberships")
      .select("user_id, role, joined_at")
      .eq("group_id", groupId)
      .eq("user_id", userId)
      .maybeSingle();

    if (existingError) {
      throw new Error(`join lookup failed: ${existingError.message}`);
    }
    if (existing) {
      return mapMember(existing as MembershipRow);
    }

    await ensureProfile(this.client, userId);

    const { data, error } = await this.client
      .from("group_memberships")
      .insert({
        group_id: groupId,
        user_id: userId,
        role: "member",
      })
      .select("user_id, role, joined_at")
      .single();

    if (error || !data) {
      throw new Error(
        `join group failed: ${error?.message ?? "no row returned"}`,
      );
    }

    return mapMember(data as MembershipRow);
  }

  async getSchedule(groupId: string): Promise<GroupSchedule> {
    const { data, error } = await this.client
      .from("group_schedules")
      .select("timezone, weekly_enabled")
      .eq("group_id", groupId)
      .maybeSingle();

    if (error) {
      throw new Error(`get schedule failed: ${error.message}`);
    }
    if (!data) {
      return { ...DEFAULT_GROUP_SCHEDULE };
    }
    return mapSchedule(data as ScheduleRow);
  }

  async putSchedule(
    groupId: string,
    schedule: GroupSchedule,
  ): Promise<GroupSchedule> {
    const { data, error } = await this.client
      .from("group_schedules")
      .upsert(
        {
          group_id: groupId,
          timezone: schedule.timezone,
          weekly_enabled: schedule.weeklyEnabled,
        },
        { onConflict: "group_id" },
      )
      .select("timezone, weekly_enabled")
      .single();

    if (error || !data) {
      throw new Error(
        `put schedule failed: ${error?.message ?? "no row returned"}`,
      );
    }
    return mapSchedule(data as ScheduleRow);
  }
}
