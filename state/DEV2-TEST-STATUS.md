# Developer 2 — test verification matrix

Last run: automated gate on `main` (orchestrator).

| Task | Coverage | Command / artifact |
|------|----------|-------------------|
| DEV2-001 | Health route | `health.test.ts` |
| DEV2-002 | JWT + `/v1/me` | `auth.test.ts` |
| DEV2-003 | SQL smoke | `migrations.smoke.test.ts` (identity/groups) |
| DEV2-004 | SQL smoke | `migrations.smoke.test.ts` (prefs/availability) |
| DEV2-005 | Groups API | `groups.test.ts` |
| DEV2-006 | Prefs/availability + privacy | `me.test.ts` |
| DEV2-007 | Planning routes + SQL smoke | `planning.test.ts`, `migrations.smoke.test.ts` |

## Run all Dev 2 tests

```bash
pnpm --filter @gather/contracts build
pnpm --filter @gather/api typecheck
pnpm --filter @gather/api test
```

Expected: **17** API tests (13 route + 4 migration smoke), **0** failures.
