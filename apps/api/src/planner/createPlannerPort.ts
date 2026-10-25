import type { PlannerPort } from "@gather/contracts";
import { createPlanner } from "@gather/planner";
import { createMockPlannerPort } from "./mockPlannerPort.js";

/**
 * Real planner (seeded discovery, no provider keys) only when PLANNER_IMPL is
 * "real" (trimmed, case-insensitive); "mock" or unset is the mock. Any other
 * value logs one warning and falls back to the mock.
 */
export function createDefaultPlannerPort(
  env: NodeJS.ProcessEnv = process.env,
): PlannerPort {
  const impl = (env.PLANNER_IMPL ?? "").trim().toLowerCase();
  if (impl === "real") return createPlanner();
  if (impl !== "" && impl !== "mock") {
    console.warn(`[planner] unknown PLANNER_IMPL "${impl}"; using mock`);
  }
  return createMockPlannerPort();
}
