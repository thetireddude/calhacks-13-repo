# Gather API (`apps/api`)

**Owner:** Developer 2  
**Branch:** `feature/core-api`

Node.js + TypeScript HTTP API and planning orchestration. See [`docs/developers/developer-2-backend.md`](../../docs/developers/developer-2-backend.md) and SPEC §4.

## Status

Bootstrap (**DEV2-001**): `GET /v1/health` → `{ "status": "ok" }`.

## Scripts

- `pnpm run dev` — watch mode via `tsx`
- `pnpm run build` / `pnpm start` — compile and run `dist/`
- `pnpm test` — health endpoint test (`node:test`)

## Route inventory

Proposed routes: SPEC §6.2. Implement incrementally; freeze DTOs in `packages/contracts` first.
