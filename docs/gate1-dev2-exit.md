# Gate 1 exit — Developer 2 (Core API)

**SPEC reference:** §8 Gate 1 — Independent vertical components (Developer 2 bullets)  
**Task:** DEV2-010  
**Branch:** `feature/core-api` / `agent/DEV2-010-gate1-exit`

## SPEC Gate 1 bullets (Developer 2)

| SPEC §8 requirement | Status | Evidence |
|---------------------|--------|----------|
| Authentication and Supabase schema | **Met** | JWT validation in `apps/api/src/auth.ts`; four migrations under `supabase/migrations/`; RLS on all tables (see [`supabase/README.md`](../supabase/README.md)). |
| API skeleton | **Met** | Fastify app in `apps/api/src/app.ts`; health + authenticated routes through voting/confirmation stubs (see [`apps/api/README.md`](../apps/api/README.md)). |
| Planning workflow using mocked planner output | **Met** | `createMockPlannerPort()` + `generateAndPersistProposals` in `apps/api/src/planning/`; ≤3 proposals; failed-run retry (`planning.test.ts`). |

**Exit condition (SPEC §8):** Each owned module builds/tests independently and respects frozen public interfaces.

| Exit check | Status | Evidence |
|------------|--------|----------|
| `@gather/contracts` builds | **Pass** | Included in `pnpm run test:dev2` |
| `@gather/api` typecheck + tests | **Pass** | `pnpm run test:dev2` — **27/27** (see [`state/DEV2-TEST-STATUS.md`](../state/DEV2-TEST-STATUS.md)) |
| CI runs Dev 2 suite | **Pass** | [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) — `pnpm typecheck`, `pnpm run test:dev2` |
| No cross-lane contract drift | **Pass** | Mobile/planner unchanged; API imports `@gather/contracts` only for DTOs and `PlannerPort` |

## Shipped scope (DEV2-001 … DEV2-009)

Gate 1 delivers the **spine** only: auth, schema, in-memory API for groups/prefs/planning/voting, mock planner orchestration. Not in Gate 1: Supabase-backed persistence for API stores, weekly scheduler, full SPEC §6.2 route inventory, approved majority/veto rules (SPEC §11 stubs).

## Verification command

From repo root:

```bash
pnpm run test:dev2
```

Expected: contracts build, API typecheck, **27** tests, **0** failures.

## Follow-on (post–Gate 1)

- Wire API stores to Supabase
- Replace voting/confirmation stubs when SPEC §11 decisions land
- Integrate real `PlannerPort` at Gate 2
