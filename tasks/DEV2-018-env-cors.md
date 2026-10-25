# DEV2-018 — Load `.env` + CORS

## Status

implementing

## Dependencies

- DEV2-017

## Execution

Primary role: implementer  
Review required: yes  
Tester required: yes  
Worktree required: yes  
Developer lane: core-api

## Goal

`pnpm --filter @gather/api run dev` picks up repo-root `.env` without `source`. Browsers / Expo can call the API (CORS).

## Allowed files

- `apps/api/package.json` (scripts + `@fastify/cors` if needed)
- `apps/api/src/index.ts` (optional listen log)
- `apps/api/src/app.ts` — **only** register CORS in `createApp` (do not change store wiring or routes)
- `apps/api/src/health.test.ts` (OPTIONS or Origin header if useful)
- `pnpm-lock.yaml` if a dependency is added
- `docs/dev2-local-setup.md` — one note that `dev` loads `../../.env`

## Do not modify

- `apps/mobile/**`, `packages/planner/**`
- Group/profile routes (DEV2-019 / DEV2-020)
- Prefer Node/`tsx --env-file ../../.env` over adding `dotenv` if it works

## Requirements

- CORS: allow typical Expo/dev origins (`origin: true` or reflect request Origin). Do not disable auth.
- `pnpm run test:ci` still passes (CI has no `.env`).
- No secrets committed.

## Handoff

Commit `DEV2-018:`, status `candidate`, no merge.
