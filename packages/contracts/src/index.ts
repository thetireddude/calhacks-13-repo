/** Semantic version for contract consumers; bump when breaking changes are agreed (SPEC §6.1). */
export const CONTRACTS_VERSION = "0.1.1-stub";

export type {
  CreateGroupRequest,
  GroupInviteResponse,
  GroupMemberResponse,
  GroupResponse,
  JoinInviteResponse,
  MeProfileStub,
  MeResponse,
} from "./groups.js";
export type {
  PlannerInput,
  PlannerPort,
  PlannerResult,
  Proposal,
} from "./planner.js";
