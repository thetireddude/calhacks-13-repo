import type { Proposal } from "@gather/contracts";

/** Gate 1 seeded catalog entry (no external discovery provider). */
export interface SeededCandidateActivity {
  activityId: string;
  title: string;
  /** Lowercase tokens matched against `activityRequest`. */
  keywords: readonly string[];
}

/** Proposal with stub activity references until contract freeze adds a shared field. */
export type PlannerProposal = Proposal & {
  activityIds: string[];
};

export const SEEDED_CANDIDATE_ACTIVITIES: readonly SeededCandidateActivity[] = [
  {
    activityId: "seed-act-brunch-01",
    title: "Weekend brunch in the city",
    keywords: ["brunch", "breakfast", "food", "weekend"],
  },
  {
    activityId: "seed-act-coffee-01",
    title: "Coffee and catch-up",
    keywords: ["coffee", "cafe", "chat", "meet"],
  },
  {
    activityId: "seed-act-dinner-01",
    title: "Dinner downtown",
    keywords: ["dinner", "restaurant", "food", "downtown", "eat"],
  },
  {
    activityId: "seed-act-hike-01",
    title: "Bay Area trail hike",
    keywords: ["hike", "trail", "outdoors", "park", "nature"],
  },
  {
    activityId: "seed-act-museum-01",
    title: "Afternoon at a local museum",
    keywords: ["museum", "art", "culture", "indoor"],
  },
] as const;

const MAX_SEEDED_PROPOSALS = 3;

function tokenizeRequest(activityRequest?: string): string[] {
  if (!activityRequest?.trim()) {
    return [];
  }
  return activityRequest
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 0);
}

function relevanceScore(
  activity: SeededCandidateActivity,
  requestTokens: string[],
): number {
  if (requestTokens.length === 0) {
    return 0;
  }
  let score = 0;
  for (const token of requestTokens) {
    if (activity.keywords.some((keyword) => keyword.includes(token) || token.includes(keyword))) {
      score += 1;
    }
    if (activity.title.toLowerCase().includes(token)) {
      score += 1;
    }
  }
  return score;
}

/** Deterministic seeded pick (≤3) for fallback discovery. */
export function pickSeededCandidates(
  input: { activityRequest?: string },
  limit = MAX_SEEDED_PROPOSALS,
): SeededCandidateActivity[] {
  const capped = Math.min(Math.max(limit, 1), MAX_SEEDED_PROPOSALS);
  const requestTokens = tokenizeRequest(input.activityRequest);
  const ranked = [...SEEDED_CANDIDATE_ACTIVITIES].sort((a, b) => {
    const scoreDiff =
      relevanceScore(b, requestTokens) - relevanceScore(a, requestTokens);
    if (scoreDiff !== 0) {
      return scoreDiff;
    }
    return a.activityId.localeCompare(b.activityId);
  });
  return ranked.slice(0, capped);
}

export function buildSeededProposal(
  activity: SeededCandidateActivity,
  rank: number,
  planningRunId: string,
): PlannerProposal {
  return {
    proposalId: `seed-${planningRunId}-${activity.activityId}`,
    rank,
    summary: activity.title,
    activityIds: [activity.activityId],
    deterministicScore: 0,
    explanation:
      "Ranked from seeded discovery fallback (no external provider).",
  };
}
