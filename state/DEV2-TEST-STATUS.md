# Developer 2 — test verification matrix

Last run: post DEV2-009 merge on `main`.

| Task | Coverage | Command / artifact |
|------|----------|-------------------|
| DEV2-001 | Health route | `health.test.ts` |
| DEV2-002 | JWT + `/v1/me` | `auth.test.ts` |
| DEV2-003 | SQL smoke | `migrations.smoke.test.ts` (identity/groups) |
| DEV2-004 | SQL smoke | `migrations.smoke.test.ts` (prefs/availability) |
| DEV2-005 | Groups API | `groups.test.ts` |
| DEV2-006 | Prefs/availability + privacy | `me.test.ts` |
| DEV2-007 | Planning routes + SQL smoke | `planning.test.ts`, `migrations.smoke.test.ts` |
| DEV2-008 | Planner orchestration, cap 3, failure retry | `planning.test.ts` |
| DEV2-009 | Vote, veto, confirmed event, idempotency | `voting.test.ts`, votes migration smoke |

## Run all Dev 2 tests (same as CI)

**Single command** — Implementer, Tester, and GitHub Actions must all use this:

```bash
pnpm install --frozen-lockfile || pnpm install
pnpm run test:ci
```

(`test:dev2` is an alias for `test:ci`.)

Expected: **27** API tests, **0** failures.

Tester **PASS** is invalid without `test:ci` on the candidate commit in the task worktree.
