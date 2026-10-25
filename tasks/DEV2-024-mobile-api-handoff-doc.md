# DEV2-024 — Dev 1 API handoff doc

## Status

merged

## Dependencies

- DEV2-020

## Execution

Primary role: implementer  
Review required: yes  
Tester required: no  
Worktree required: yes  
Developer lane: core-api

## Goal

One page Dev 1 can use to call the live API.

## Allowed files

- `docs/dev2-api-for-mobile.md` (new)
- `apps/api/README.md` — one link to that doc

## Do not modify

- Application source except the README link
- `apps/mobile/**`

## Requirements

Document: base URL, JWT header, `{ error }` codes, routes that exist (including list groups, PUT /v1/me, schedule/ICS/notifications **as “if present on branch”** or current main), `sub` must be auth.users UUID in DB mode, CORS, Expo `EXPO_PUBLIC_API_URL` (LAN IP not 127.0.0.1 on device).

## Handoff

Commit `DEV2-024:`, status `candidate`, no merge.
