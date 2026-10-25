import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { PlanningRunResponse, Proposal } from "@gather/contracts";
import type { PlanningStore, ProposalContext } from "./store.js";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type PlanningRunRow = {
  id: string;
  group_id: string;
  status: string;
  initiated_by: string;
  activity_request: string | null;
  created_at: string;
  updated_at: string;
};

type ProposalRow = {
  id: string;
  planning_run_id: string;
  rank: number;
  summary: string;
  deterministic_score: number | string | null;
  explanation: string | null;
  revision_id: string | null;
  created_at: string;
};

function toIsoTimestamp(value: string): string {
  return new Date(value).toISOString();
}

function persistProposalId(proposalId: string): string {
  return UUID_RE.test(proposalId) ? proposalId : randomUUID();
}

function toNullableNumber(value: number | string | null): number | undefined {
  if (value == null) {
    return undefined;
  }
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function mapRun(row: PlanningRunRow): PlanningRunResponse {
  return {
    id: row.id,
    groupId: row.group_id,
    status: row.status,
    initiatedBy: row.initiated_by,
    ...(row.activity_request != null
      ? { activityRequest: row.activity_request }
      : {}),
    createdAt: toIsoTimestamp(row.created_at),
  };
}

function mapProposal(row: ProposalRow): Proposal {
  const score = toNullableNumber(row.deterministic_score);
  return {
    proposalId: row.id,
    rank: row.rank,
    summary: row.summary,
    ...(score !== undefined ? { deterministicScore: score } : {}),
    ...(row.explanation != null ? { explanation: row.explanation } : {}),
    ...(row.revision_id != null ? { revisionId: row.revision_id } : {}),
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

export class SupabasePlanningStore implements PlanningStore {
  constructor(private readonly client: SupabaseClient) {}

  async createRun(
    groupId: string,
    initiatedBy: string,
    activityRequest?: string,
  ): Promise<PlanningRunResponse> {
    await ensureProfile(this.client, initiatedBy);

    const { data, error } = await this.client
      .from("planning_runs")
      .insert({
        group_id: groupId,
        status: "pending",
        initiated_by: initiatedBy,
        activity_request: activityRequest ?? null,
      })
      .select(
        "id, group_id, status, initiated_by, activity_request, created_at, updated_at",
      )
      .single();

    if (error || !data) {
      throw new Error(
        `create planning run failed: ${error?.message ?? "no row returned"}`,
      );
    }
    return mapRun(data as PlanningRunRow);
  }

  async getRun(runId: string): Promise<PlanningRunResponse | undefined> {
    const { data, error } = await this.client
      .from("planning_runs")
      .select(
        "id, group_id, status, initiated_by, activity_request, created_at, updated_at",
      )
      .eq("id", runId)
      .maybeSingle();

    if (error) {
      throw new Error(`get planning run failed: ${error.message}`);
    }
    if (!data) {
      return undefined;
    }
    return mapRun(data as PlanningRunRow);
  }

  async listProposals(runId: string): Promise<Proposal[]> {
    const run = await this.getRun(runId);
    if (!run) {
      return [];
    }

    const { data, error } = await this.client
      .from("proposals")
      .select(
        "id, planning_run_id, rank, summary, deterministic_score, explanation, revision_id, created_at",
      )
      .eq("planning_run_id", runId)
      .order("rank", { ascending: true });

    if (error) {
      throw new Error(`list proposals failed: ${error.message}`);
    }
    return (data ?? []).map((row) => mapProposal(row as ProposalRow));
  }

  async findProposalContext(
    proposalId: string,
  ): Promise<ProposalContext | undefined> {
    const { data, error } = await this.client
      .from("proposals")
      .select(
        "id, planning_run_id, rank, summary, deterministic_score, explanation, revision_id, created_at",
      )
      .eq("id", proposalId)
      .maybeSingle();

    if (error) {
      throw new Error(`get proposal failed: ${error.message}`);
    }
    if (!data) {
      return undefined;
    }

    const row = data as ProposalRow;
    const run = await this.getRun(row.planning_run_id);
    if (!run) {
      return undefined;
    }
    return {
      groupId: run.groupId,
      runId: run.id,
      proposal: mapProposal(row),
    };
  }

  async completeRun(runId: string, proposals: Proposal[]): Promise<void> {
    const run = await this.getRun(runId);
    if (!run) {
      return;
    }

    const { error: deleteError } = await this.client
      .from("proposals")
      .delete()
      .eq("planning_run_id", runId);
    if (deleteError) {
      throw new Error(`replace proposals failed: ${deleteError.message}`);
    }

    if (proposals.length > 0) {
      const { error: insertError } = await this.client.from("proposals").insert(
        proposals.map((proposal) => ({
          id: persistProposalId(proposal.proposalId),
          planning_run_id: runId,
          rank: proposal.rank,
          summary: proposal.summary,
          deterministic_score: proposal.deterministicScore ?? null,
          explanation: proposal.explanation ?? null,
          revision_id: proposal.revisionId ?? null,
        })),
      );
      if (insertError) {
        throw new Error(`insert proposals failed: ${insertError.message}`);
      }
    }

    const now = new Date().toISOString();
    const { error: updateError } = await this.client
      .from("planning_runs")
      .update({ status: "completed", updated_at: now })
      .eq("id", runId);
    if (updateError) {
      throw new Error(`complete planning run failed: ${updateError.message}`);
    }
  }

  async markRunFailed(runId: string): Promise<void> {
    const run = await this.getRun(runId);
    if (!run) {
      return;
    }

    const { error: deleteError } = await this.client
      .from("proposals")
      .delete()
      .eq("planning_run_id", runId);
    if (deleteError) {
      throw new Error(`clear proposals failed: ${deleteError.message}`);
    }

    const now = new Date().toISOString();
    const { error: updateError } = await this.client
      .from("planning_runs")
      .update({ status: "failed", updated_at: now })
      .eq("id", runId);
    if (updateError) {
      throw new Error(`mark planning run failed: ${updateError.message}`);
    }
  }
}
