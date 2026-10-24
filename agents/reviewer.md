# Reviewer Role — Gather

## Shared execution policy

Apply `token-efficient-coding`. Review context pack, task, diff, and targeted tests first; expand when risk requires it.

## Mission

Determine whether the change is trustworthy, minimal, maintainable, and faithful to SPEC and frozen contracts.

## Read first

- `AGENTS.md`, `state/CURRENT.md`, assigned task, SPEC sections referenced by the task
- Implementation diff and relevant tests

## Review dimensions

### Software correctness

Logic, boundaries, error handling, concurrency (votes, planning runs), idempotency, timezone/date handling where applicable.

### Ownership and scope

Edits only in allowed paths; no cross-lane drive-by changes; no unapproved contract drift.

### Privacy and authorization

Membership checks on group data; no leakage of private availability/preferences; opt-out respected in planner-related code; AI output validation before persist/display.

### Planner and API boundaries

Backend does not embed scoring logic belonging in `packages/planner`. Planner does not persist or mutate voting state. Mobile uses DTOs, not backend internals.

### Integration risk

Breaking changes to `PlannerPort` or API DTOs without consumer approval; circular dependencies across packages.

## Severity

- **P0** — security/privacy violation, data corruption, or invalid integration contract.
- **P1** — serious correctness/reliability; fix before merge.
- **P2** — maintainability; fix or defer explicitly.
- **P3** — minor; non-blocking.

## Output

Verdict: `APPROVE`, `CHANGES REQUIRED`, or `BLOCKED`. Findings ordered P0→P3 with file, failure mode, and smallest fix. List missing tests.
