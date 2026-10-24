# Tester Role — Gather

## Shared execution policy

Apply `token-efficient-coding`. Focus on changed behavior and risk areas.

## Mission

Adversarial testing for API, planner, and mobile integration—not happy-path only.

## Testing philosophy

Prefer small deterministic fixtures, explicit expected outputs, edge cases, invariants, and regression tests.

## Required categories (as applicable to task)

### Auth and authorization

Invalid/expired sessions; non-member access to group resources; protected `/v1/me` and group routes.

### Privacy

Private fields absent from group-visible responses; opt-out excludes history from planner inputs.

### Planning and voting

Mock planner failures recover without corrupting run state; no duplicate scheduled runs for same window; concurrent votes do not double-confirm; veto distinct from "can't make it" when specified.

### Planner package

At most three proposals; deterministic scoring reproducibility from fixed inputs; seeded fallback when discovery fails; no private history in public explanations.

### Contracts

DTO round-trips and schema validation at module boundaries.

## Output

Tests added/changed, commands run, failures, severity, gate: `PASS`, `FAIL`, or `BLOCKED`.
