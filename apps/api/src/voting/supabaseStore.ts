import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ConfirmedEventResponse,
  ProposalVetoResponse,
  ProposalVoteResponse,
  VoteChoice,
} from "@gather/contracts";
import type { VotingStore } from "./store.js";

type VoteRow = {
  proposal_id: string;
  user_id: string;
  choice: string;
  updated_at: string;
};

type VetoRow = {
  proposal_id: string;
  user_id: string;
  created_at: string;
};

type ConfirmedRow = {
  id: string;
  group_id: string;
  proposal_id: string;
  planning_run_id: string;
  summary: string;
  confirmed_at: string;
};

function toIsoTimestamp(value: string): string {
  return new Date(value).toISOString();
}

function isUniqueViolation(error: { code?: string } | null): boolean {
  return error?.code === "23505";
}

function mapVote(row: VoteRow): ProposalVoteResponse {
  return {
    proposalId: row.proposal_id,
    userId: row.user_id,
    choice: row.choice as VoteChoice,
    updatedAt: toIsoTimestamp(row.updated_at),
  };
}

function mapVeto(row: VetoRow): ProposalVetoResponse {
  return {
    proposalId: row.proposal_id,
    userId: row.user_id,
    vetoed: true,
    createdAt: toIsoTimestamp(row.created_at),
  };
}

function mapConfirmed(row: ConfirmedRow): ConfirmedEventResponse {
  return {
    id: row.id,
    groupId: row.group_id,
    proposalId: row.proposal_id,
    planningRunId: row.planning_run_id,
    summary: row.summary,
    confirmedAt: toIsoTimestamp(row.confirmed_at),
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

export class SupabaseVotingStore implements VotingStore {
  constructor(private readonly client: SupabaseClient) {}

  async upsertVote(
    proposalId: string,
    userId: string,
    choice: VoteChoice,
  ): Promise<ProposalVoteResponse> {
    await ensureProfile(this.client, userId);

    const { data, error } = await this.client
      .from("proposal_votes")
      .upsert(
        {
          proposal_id: proposalId,
          user_id: userId,
          choice,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "proposal_id,user_id" },
      )
      .select("proposal_id, user_id, choice, updated_at")
      .single();

    if (error || !data) {
      throw new Error(
        `upsert vote failed: ${error?.message ?? "no row returned"}`,
      );
    }
    return mapVote(data as VoteRow);
  }

  async getVote(
    proposalId: string,
    userId: string,
  ): Promise<ProposalVoteResponse | undefined> {
    const { data, error } = await this.client
      .from("proposal_votes")
      .select("proposal_id, user_id, choice, updated_at")
      .eq("proposal_id", proposalId)
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      throw new Error(`get vote failed: ${error.message}`);
    }
    if (!data) {
      return undefined;
    }
    return mapVote(data as VoteRow);
  }

  async countApprovals(proposalId: string): Promise<number> {
    const { count, error } = await this.client
      .from("proposal_votes")
      .select("proposal_id", { count: "exact", head: true })
      .eq("proposal_id", proposalId)
      .eq("choice", "approve");

    if (error) {
      throw new Error(`count approvals failed: ${error.message}`);
    }
    return count ?? 0;
  }

  async recordVeto(
    proposalId: string,
    userId: string,
  ): Promise<ProposalVetoResponse> {
    await ensureProfile(this.client, userId);

    const existing = await this.getVeto(proposalId, userId);
    if (existing) {
      return existing;
    }

    const { data, error } = await this.client
      .from("proposal_vetoes")
      .insert({
        proposal_id: proposalId,
        user_id: userId,
      })
      .select("proposal_id, user_id, created_at")
      .single();

    if (error) {
      if (isUniqueViolation(error)) {
        const raced = await this.getVeto(proposalId, userId);
        if (raced) {
          return raced;
        }
      }
      throw new Error(`record veto failed: ${error.message}`);
    }
    if (!data) {
      throw new Error("record veto failed: no row returned");
    }
    return mapVeto(data as VetoRow);
  }

  async getVeto(
    proposalId: string,
    userId: string,
  ): Promise<ProposalVetoResponse | undefined> {
    const { data, error } = await this.client
      .from("proposal_vetoes")
      .select("proposal_id, user_id, created_at")
      .eq("proposal_id", proposalId)
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      throw new Error(`get veto failed: ${error.message}`);
    }
    if (!data) {
      return undefined;
    }
    return mapVeto(data as VetoRow);
  }

  async getConfirmedEvent(
    groupId: string,
  ): Promise<ConfirmedEventResponse | undefined> {
    const { data, error } = await this.client
      .from("confirmed_events")
      .select(
        "id, group_id, proposal_id, planning_run_id, summary, confirmed_at",
      )
      .eq("group_id", groupId)
      .maybeSingle();

    if (error) {
      throw new Error(`get confirmed event failed: ${error.message}`);
    }
    if (!data) {
      return undefined;
    }
    return mapConfirmed(data as ConfirmedRow);
  }

  async getConfirmedEventById(
    eventId: string,
  ): Promise<ConfirmedEventResponse | undefined> {
    const { data, error } = await this.client
      .from("confirmed_events")
      .select(
        "id, group_id, proposal_id, planning_run_id, summary, confirmed_at",
      )
      .eq("id", eventId)
      .maybeSingle();

    if (error) {
      throw new Error(`get confirmed event by id failed: ${error.message}`);
    }
    if (!data) {
      return undefined;
    }
    return mapConfirmed(data as ConfirmedRow);
  }

  async tryConfirmFromMajority(input: {
    groupId: string;
    proposalId: string;
    planningRunId: string;
    summary: string;
    memberCount: number;
  }): Promise<ConfirmedEventResponse | undefined> {
    const existing = await this.getConfirmedEvent(input.groupId);
    if (existing) {
      return existing;
    }

    const threshold = Math.ceil(input.memberCount / 2);
    if ((await this.countApprovals(input.proposalId)) < threshold) {
      return undefined;
    }

    const racedBeforeInsert = await this.getConfirmedEvent(input.groupId);
    if (racedBeforeInsert) {
      return racedBeforeInsert;
    }

    const { data, error } = await this.client
      .from("confirmed_events")
      .insert({
        group_id: input.groupId,
        proposal_id: input.proposalId,
        planning_run_id: input.planningRunId,
        summary: input.summary,
      })
      .select(
        "id, group_id, proposal_id, planning_run_id, summary, confirmed_at",
      )
      .single();

    if (error) {
      if (isUniqueViolation(error)) {
        const raced = await this.getConfirmedEvent(input.groupId);
        if (raced) {
          return raced;
        }
      }
      throw new Error(`confirm event failed: ${error.message}`);
    }
    if (!data) {
      throw new Error("confirm event failed: no row returned");
    }
    return mapConfirmed(data as ConfirmedRow);
  }
}
