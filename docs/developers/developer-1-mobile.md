# Developer 1 — Mobile (Expo)

**Branch:** `feature/mobile`  
**Owns:** `apps/mobile/**`

## Your job

Email OTP auth UX, groups, preferences/availability setup, planning UI, voting/veto UI, confirmed events, in-app notifications, ICS export. Physical-phone demo is the primary target.

## Must read

1. [`AGENTS.md`](../../AGENTS.md)
2. [`SPEC.md`](../../SPEC.md) §3, §6.2 (API inventory), §7, §10
3. [`state/CURRENT.md`](../../state/CURRENT.md)
4. Task: [`tasks/DEV1-001-mobile-readiness.md`](../../tasks/DEV1-001-mobile-readiness.md)

## Must not edit

- `supabase/**`, `apps/api/**` route implementations
- `packages/planner/**`
- Voting business rules on the server
- Shared contracts without review

## Testing stance

Use API **mock fixtures** that match approved DTOs in `packages/contracts`. Do not invent client-only voting or fairness rules that diverge from the backend.

## First tasks (after Gate 0 scaffold)

See `tasks/index.md` — typically `DEV1-001` then navigation/auth shell tasks once contracts stub exists.
