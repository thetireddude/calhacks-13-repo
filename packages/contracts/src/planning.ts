/** Planning run API DTOs (SPEC §6.2); status strings are Gate 1 stubs (SPEC §11). */

import type { Proposal } from "./planner.js";

export type CreatePlanningRunRequest = {
  activityRequest?: string;
};

export type PlanningRunResponse = {
  id: string;
  groupId: string;
  /** Stub values: `pending`, `completed` until SPEC §11 freeze. */
  status: string;
  initiatedBy: string;
  activityRequest?: string;
  createdAt: string;
};

export type PlanningRunProposalsResponse = {
  proposals: Proposal[];
};
