# DEV1-003 — Auth screens with mock API

## Status

candidate

## Dependencies

- DEV1-002

## Execution

Primary role: implementer  
Review required: yes  
Tester required: no  
Worktree required: yes  
Developer lane: mobile

## Goal

Replace the single-tap mock sign-in with email + OTP placeholder screens backed by an in-app mock auth API, wired into the existing React Navigation stack.

## Read first

- `docs/milestone-dag.md` W4
- `apps/mobile/README.md`
- `docs/developers/developer-1-mobile.md`

## Allowed files

- `apps/mobile/**`

## Do not modify

- `apps/api/**`, `supabase/**`, `packages/**`

## Acceptance criteria

- User can enter email → receive mock OTP send → enter code → land on Home on success.
- Mock sign-out clears session and returns to Welcome.
- README documents mock OTP code and smoke path.
- `pnpm --filter @gather/mobile typecheck` passes.

## Required tests

- Manual/simulator smoke documented in handoff.

## Handoff

See commit message and implementer summary on branch `agent/DEV1-003-auth-mock`.
