import type { ApprovedScoreComponents } from "./ranking.js";

export interface MemberCandidateAssessment {
  readonly available: boolean;
  readonly preferenceOverlap: number;
  readonly priceKnown: boolean;
  readonly withinBudget: boolean;
  readonly distanceKnown: boolean;
  readonly withinTravelRadius: boolean;
  readonly learningOptIn: boolean;
  readonly inclusionDebt: number;
}

function unit(value: number, name: string): number {
  if (!Number.isFinite(value) || value < 0 || value > 1) throw new RangeError(`${name} must be 0 through 1`);
  return value;
}

function average(values: readonly number[]): number {
  return values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;
}

/** Implements the accepted ADR-002 component formulas, not vote logic. */
export function calculateApprovedScoreComponents(
  assessments: readonly MemberCandidateAssessment[],
): ApprovedScoreComponents {
  if (assessments.length === 0) throw new RangeError("at least one member assessment is required");
  const feasible = assessments.filter((member) =>
    member.available && (!member.priceKnown || member.withinBudget) && (!member.distanceKnown || member.withinTravelRadius),
  );
  const expectedAttendance = feasible.length / assessments.length;
  const sharedPreferenceFit = average(feasible.map((member) => unit(member.preferenceOverlap, "preferenceOverlap")));
  const budgetTravelFit = average(assessments.map((member) => {
    const budget = member.priceKnown ? (member.withinBudget ? 1 : 0) : 0.5;
    const travel = member.distanceKnown ? (member.withinTravelRadius ? 1 : 0) : 0.5;
    return (budget + travel) / 2;
  }));
  const totalWeight = assessments.reduce((sum, member) => sum + 1 + (member.learningOptIn ? Math.min(3, Math.max(0, member.inclusionDebt)) : 0), 0);
  const feasibleWeight = feasible.reduce((sum, member) => sum + 1 + (member.learningOptIn ? Math.min(3, Math.max(0, member.inclusionDebt)) : 0), 0);

  return { expectedAttendance, sharedPreferenceFit, budgetTravelFit, inclusionFairness: feasibleWeight / totalWeight };
}

export function meetsMinimumFeasibleMembers(assessments: readonly MemberCandidateAssessment[]): boolean {
  return assessments.filter((member) => member.available && (!member.priceKnown || member.withinBudget) && (!member.distanceKnown || member.withinTravelRadius)).length >= 2;
}
