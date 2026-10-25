# ADR-003: Planner public contract for Gate 2

**Status:** Proposed — requires Developer 1 and Developer 2 approval before any `packages/contracts/**` change.

## Context

ADR-002 freezes the initial-demo planning rules, while the current public
`PlannerInput`/`PlannerResult` are stubs. The API must provide authorized data
to `PlannerPort`; the planner must return validated, group-visible results and
never persist or decide votes.

## Proposed contract

`PlannerInput` retains backend-owned `groupId` and `planningRunId`, plus an
optional requested activity/category and city. It contains only:

- `members`: opaque `memberRef`; selected tags; candidate/window availability;
  budget ceiling; travel radius; and `inclusionDebt` in `0..3` only when that
  member opted in to learning.
- `candidates`: normalized public candidate ID/title/category/city/future
  start time/public source URL, optional public venue/price/distance metadata,
  and source type.

It must not contain names, email, raw calendar data, raw preference history,
private event details, or any opted-out history/debt.

`PlannerResult` contains the same `planningRunId`, generation instant, at most
three ranked `proposals`, and either no tie or a two-proposal exact-tie result.
Each proposal contains a backend-persisted proposal ID, rank, public candidate
summary, deterministic total and approved component scores, and an aggregate
explanation. It contains no member-level feasibility, preferences, availability,
history, or provider output.

The result may include a proposed, backend-owned inclusion-ledger update keyed
by opaque member ref. The API validates and persists it only after its own
authorization and confirmation rules; the planner never writes it.

## Validation and versioning

Both boundary objects require runtime schemas and contract round-trip fixtures.
Unknown fields are rejected at the API-to-planner boundary. The additive
contract release must bump `CONTRACTS_VERSION`; any breaking field change needs
another ADR and consumer approval.

## Decision required

Developer 1 must approve the group-visible proposal/explanation shape.
Developer 2 must approve backend-owned identifiers, persistence, validation,
and ledger handling. After both approvals are recorded, Developer 2 may update
`packages/contracts/**`, and DEV3-003 may compose the public planner path.
