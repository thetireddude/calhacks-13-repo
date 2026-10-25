import type { RankedCandidate } from "./ranking.js";

/** The planner may surface no more than three ranked proposals (SPEC §5). */
export function selectProposalCandidates(
  candidates: readonly RankedCandidate[],
  now: Date = new Date(),
): readonly RankedCandidate[] {
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
