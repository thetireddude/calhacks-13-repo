# GATE2-EXIT evidence (GATE2-001, candidate)

Branch `agent/GATE2-001-planner-integration`.

## Commands (from clean `apps/api/dist`, `packages/*/dist`)

- `pnpm run test:ci` (contracts build, planner build, api typecheck, api tests): 64 pass, 0 fail.
- `cd packages/planner && npm test`: 26 pass, 0 fail.
- `pnpm --filter @gather/mobile test`: 310 pass.
- `pnpm --filter @gather/api typecheck`: clean.

## Gate 2 conditions demonstrated (in-memory stores)

- API imports the planner through `@gather/planner` public entry only.
- Real planner output through `POST /v1/groups/:id/planning-runs` completes with 1..3 ranked proposals, persisted and returned.
- Backend validation rejects mismatched run id, empty/non-array output, duplicate ranks/ids, malformed items, empty summary, unsafe explanation: run `failed`, no proposals stored, retry route completes.
- Real planner with a rejecting discovery fails closed; run recoverable.
- Privacy: markers from saved preferences/availability absent from run, listing and stored proposals; planner input contains only groupId/planningRunId/activityRequest.
- `createDefaultPlannerPort` mock by default, real with `PLANNER_IMPL=real`.

## NOT demonstrated

- Live Supabase-backed run with the real planner.
- Live Creao / Bright Data discovery or personal-agent evaluations.
- Member context / opt-out flowing into the planner (not implemented; see tasks/GATE2-001-planner-integration.md gaps).
- Mobile-inputs table decisions in tasks/GATE2-EXIT.md; reviewer and tester gates.
