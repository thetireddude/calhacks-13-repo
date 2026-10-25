# DEV1-001 — Mobile app bootstrap

## Status

candidate

## Dependencies

- GATE0-001

## Execution

Primary role: implementer  
Review required: yes  
Tester required: no  
Worktree required: yes  
Developer lane: mobile

## Goal

Initialize Expo app in `apps/mobile` on branch `feature/mobile` with navigation shell and env wiring for Supabase (no full flows until contracts frozen).

## Read first

- `docs/developers/developer-1-mobile.md`
- `SPEC.md` §3

## Allowed files

- `apps/mobile/**`

## Do not modify

- `apps/api/**`, `supabase/**`, `packages/planner/**`, `packages/contracts/**` (read-only import once GATE0-002 exists)

## Acceptance criteria

- App launches on simulator or physical device.
- README in `apps/mobile` documents local run commands.
- Placeholder screens listed for MVP journey (SPEC §1).

## Required tests

- Smoke: app bundle builds.

## Notes

Unblocked when GATE0-001 completes. Prefer API mocks until GATE0-002 DTOs are approved.
