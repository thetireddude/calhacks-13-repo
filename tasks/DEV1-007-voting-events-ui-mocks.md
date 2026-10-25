# DEV1-007 — Voting, confirmed event, and notifications UI mocks

## Status

candidate

## Dependencies

- DEV1-006

## Execution

Primary role: implementer  
Review required: yes  
Tester required: yes  
Worktree required: yes  
Developer lane: mobile  
Gate: Gate 1

## Goal

Voting controls, separate veto, revision/revote display, deadline, confirmation/cancellation states, confirmed event view, ICS export action, and in-app notification feed against mocks.

## Read first

- `AGENTS.md`
- `docs/project-dag.md`
- `state/CURRENT.md`
- `docs/developers/developer-1-mobile.md`
- `SPEC.md` — SPEC §3 Voting, Confirmed events, §6.2 vote/veto/confirmed-event/ics/notifications
- `state/task-context/DEV1-007.md`
- `packages/contracts/src/**` (consume only)

## Allowed files

- `apps/mobile/**`

## May modify if necessary

- none

## Do not modify

- `apps/api/**`, `supabase/**`, `packages/planner/**`
- `packages/contracts/**` (consume only; request changes via SPEC §9)
- Root workspace config (integration owner), except lockfile when adding a workspace dep and the task allows it

## Requirements

- Vote UI wired to `PutProposalVoteRequest`/`ProposalVoteResponse`; veto as a visually and functionally separate control using `ProposalVetoResponse` (veto authorization/scope is SPEC §11: show control per backend flag only).
- Display-only handling of Interested / Can't make it / Suggest another per contract `VoteChoice`; if `suggest another` is absent from contracts, record a SPEC §9 change request.
- Revision and revote banners and voting-deadline display rendered from backend fields.
- Confirmed event screen using `ConfirmedEventResponse`; accessible to declining members; cancellation state.
- ICS export action stub behind an `IcsClient` interface (serialization owner is SPEC §11).
- In-app notification feed screen against a mocked list; notification payload format not frozen — stub, record contract request.

## Critical correctness constraints

- Never display or mock other members' private availability or raw preference history.
- No client-side voting, fairness, or planner scoring rules; do not guess SPEC §11 items.
- No client-side majority, deadline, veto-scope, or revote rules; UI renders backend state only.
- Veto must remain distinct from Can't make it in UI and API calls.
- Confirmed event visible to every group member regardless of own vote.
- Notification feed works with push permission denied.

## Acceptance criteria

- Vote/veto/confirmed/cancelled/revision states render accurately from fixtures.
- Declining member fixture can open confirmed event.
- Notification feed renders with no push registration.

## Required tests

- State-rendering tests per fixture; veto-vs-decline distinctness test; declining-member access test.

## Handoff

Commit `DEV1-007:` on `agent/DEV1-007-voting-events-ui-mocks`, set status `candidate`, no merge. Report files changed, commands run (`pnpm --filter @gather/contracts build`, `pnpm --filter @gather/mobile typecheck`, `pnpm --filter @gather/mobile test`), results, limitations, what is not wired yet, and any SPEC §9 contract change requests.
