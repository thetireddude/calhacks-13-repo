import type { ActivityCandidate, CandidateDiscoveryPort, DiscoveryQuery } from "./domain.js";

const SEEDED_CANDIDATES: readonly ActivityCandidate[] = [
  {
    id: "seeded-mission-comedy",
    title: "Mission Comedy Showcase",
    category: "comedy",
    startsAt: "2026-10-31T19:30:00-07:00",
    endsAt: "2026-10-31T21:00:00-07:00",
    venueName: "The Mission Theater",
    city: "San Francisco",
    priceText: "$15",
    isFree: false,
    sourceUrl: "https://example.invalid/seeded/mission-comedy",
    source: "seeded",
  },
  {
    id: "seeded-golden-gate-walk",
    title: "Golden Gate Park Walking Group",
    category: "outdoors",
    startsAt: "2026-11-01T10:00:00-08:00",
    endsAt: "2026-11-01T12:00:00-08:00",
    venueName: "Golden Gate Park",
    city: "San Francisco",
    priceText: "Free",
    isFree: true,
    sourceUrl: "https://example.invalid/seeded/golden-gate-walk",
    source: "seeded",
  },
  {
    id: "seeded-museum-evening",
    title: "Museum Late Night",
    category: "art",
    startsAt: "2026-11-05T18:00:00-08:00",
    endsAt: "2026-11-05T21:00:00-08:00",
    venueName: "Bay Arts Center",
    city: "San Francisco",
    priceText: "$12",
    isFree: false,
    sourceUrl: "https://example.invalid/seeded/museum-evening",
    source: "seeded",
  },
] as const;

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase("en-US");
}

function clone(candidate: ActivityCandidate): ActivityCandidate {
  return { ...candidate };
}

/**
 * Deterministic, local discovery used in tests and whenever a live source is
 * unavailable. It never reads credentials or performs network requests.
 */
export class SeededCandidateDiscovery implements CandidateDiscoveryPort {
  public async discover(query: DiscoveryQuery = {}): Promise<readonly ActivityCandidate[]> {
    const city = query.city ? normalize(query.city) : undefined;
    const categories = new Set((query.categories ?? []).map(normalize));
    const limit = Math.max(0, Math.min(query.limit ?? 3, 3));

    return SEEDED_CANDIDATES
      .filter((candidate) => !city || normalize(candidate.city) === city)
      .filter((candidate) => categories.size === 0 || categories.has(normalize(candidate.category)))
      .slice(0, limit)
      .map(clone);
  }
}
