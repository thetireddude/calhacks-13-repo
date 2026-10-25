import type { ActivityCandidate } from "./domain.js";

interface CandidateEntry {
  readonly candidate: ActivityCandidate;
}

/** The planner may surface no more than three ranked proposals (SPEC §5). */
export function selectProposalCandidates<T extends CandidateEntry>(
  candidates: readonly T[],
  now: Date = new Date(),
): readonly T[] {
  return candidates
    .filter(({ candidate }) => hasFutureStart(candidate.startsAt, now))
    .slice(0, 3);
}

/** ADR-002 requires proposal candidates to have a valid future date/time. */
function hasFutureStart(startsAt: string | null, now: Date): boolean {
  if (startsAt === null) return false;
  const instant = Date.parse(startsAt);
  return Number.isFinite(instant) && instant > now.getTime();
}
