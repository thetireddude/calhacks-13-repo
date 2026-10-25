# Gather Planner (`packages/planner`)

**Owner:** Developer 3  
**Branch:** `feature/planner`

## DEV3-001 / DEV3-003

`createPlanner()` returns a `PlannerPort` with up to three ranked proposals. When no `discoveryProvider` is configured (or it fails or returns no candidates), proposals are built from the seeded activity catalog in `seededCandidateActivities.ts`, each with stub `activityIds` on the planner proposal shape until contract freeze.

Optional `createPlanner({ discoveryProvider })` accepts external candidates; empty or failed discovery falls back to seeded data (SPEC §5).

```bash
pnpm --filter @gather/planner run test
```
