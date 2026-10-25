# GATE2-EXIT evidence (GATE2-001, candidate)

Branch `agent/GATE2-001-planner-integration`.

## Commands (from clean `apps/api/dist`, `packages/*/dist`)

- `pnpm run test:ci` (contracts build, planner build, api typecheck, api tests): 82 pass, 0 fail.
- `cd packages/planner && npm test`: 26 pass, 0 fail.
- `pnpm --filter @gather/mobile test`: 310 pass.
- `pnpm --filter @gather/api typecheck`: clean.

## Gate 2 conditions demonstrated (in-memory stores)

- API imports the planner through `@gather/planner` public entry only.
- Real planner output through `POST /v1/groups/:id/planning-runs` completes with 1..3 ranked proposals, persisted and returned.
- Backend validation rejects mismatched run id, empty/non-array output, more than 10 proposals (fail closed), any invalid item including beyond the third, duplicate/gapped/zero ranks (a valid result with more than 3 keeps the top three by rank), duplicate ids, malformed items, empty/oversize fields, unsafe summary or explanation, bad revisionId: run `failed`, no proposals stored, retry route completes.
- Planner timeout (recoverable), per-run in-flight guard (concurrent `/generate`: planner called once, others 409), log lines carry only run id and reason code / error class name (tested).
- Real planner with a rejecting discovery fails closed; run recoverable.
- Privacy: markers from saved preferences/availability absent from run, listing and stored proposals; planner input contains only groupId/planningRunId/activityRequest.
- `createDefaultPlannerPort` mock by default, real with `PLANNER_IMPL=real`.

## Known limitations (stated plainly)

- The real planner ignores `activityRequest`, returns identical seeded candidates for every group, and returns no scores.
- Supabase store replaces non-UUID proposal ids with its own UUIDs.
- Member context / `learningOptIn` are NOT passed to the planner, so the learning opt-out requirement is unmet.
- `isPublicExplanationSafe` (applied to summary and explanation) is a best-effort substring filter, not a privacy guarantee (misses emails, phones, addresses, "free on Friday"; false-positives on "history"). The real guarantee is that no member context reaches the planner.
- `completeRun` is not atomic in the Supabase store. The in-flight guard is per-process only; a Postgres RPC (delete+insert+status in one transaction) and conditional claim update are Dev 2's surface and remain an open request.
- A live run was done 2026-10-24 with `PLANNER_IMPL=real` via `apps/mobile/scripts/live-smoke.mts`: 19/20 checks, with the schedule migration unapplied. Nothing else live was run.
- The API needs `pnpm --filter @gather/planner build` before `dev`/`start`/tests.

## NOT demonstrated

- Live Supabase-backed run beyond the single smoke above (schedule migration unapplied).
- Live Creao / Bright Data discovery or personal-agent evaluations.
- Member context / opt-out flowing into the planner (not implemented; see tasks/GATE2-001-planner-integration.md gaps).
- Mobile-inputs table decisions in tasks/GATE2-EXIT.md; reviewer and tester gates.
