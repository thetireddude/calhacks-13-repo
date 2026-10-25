import type { PlannerPort } from "@gather/contracts";
import { createPlanner } from "@gather/planner";
import { createMockPlannerPort } from "./mockPlannerPort.js";

/** Real planner (seeded discovery, no provider keys) only when PLANNER_IMPL=real; otherwise the mock. */
export function createDefaultPlannerPort(
  env: NodeJS.ProcessEnv = process.env,
): PlannerPort {
  return env.PLANNER_IMPL === "real" ? createPlanner() : createMockPlannerPort();
}
