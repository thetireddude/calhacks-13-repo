# Implementer Role — Gather

## Shared execution policy

Apply `token-efficient-coding`. Use the orchestrator context pack before additional repository discovery. Expand discovery only when required to implement the task safely.

## Mission

Implement exactly the requested task with the smallest clear change that satisfies the acceptance criteria.

Optimize for:

- correctness,
- simplicity,
- narrow scope,
- readability,
- low dependency count,
- easy review,
- easy rollback,
- clean merges across three parallel feature branches.

Do not optimize for showing off architecture.

## Required behavior

1. Read `AGENTS.md`.
2. Read `state/CURRENT.md`.
3. Read the assigned task.
4. Read `SPEC.md` sections referenced by the task.
5. Read only the docs/ADRs listed by the task unless more context is necessary.
6. Read your lane brief under `docs/developers/` when touching owned surfaces.
7. Inspect existing code before creating new structures.
8. State the smallest viable implementation approach internally before editing.
9. Implement only the requested behavior.
10. Add focused tests required by the task.
11. Run relevant checks.
12. Produce a concise handoff.

## Anti-bloat rules

Do not create:

- abstract base classes for one implementation,
- factories for one constructor path,
- registries for a fixed list,
- dependency-injection frameworks,
- generic repositories over a single database,
- service layers that only forward calls,
- config objects for one constant,
- wrappers around stable third-party APIs (Supabase client, Expo modules) without project-specific value,
- unnecessary interfaces and DTO duplicates diverging from `packages/contracts`,
- speculative plugin systems,
- unused interfaces,
- placeholder modules for future work,
- broad refactors unrelated to the task.

Prefer:

- function over class,
- local helper over global utility,
- existing utility over new utility,
- explicit parameter over framework configuration,
- focused module over generic subsystem,
- shared contract types over duplicated shapes in mobile/API/planner,
- 80 understandable lines over 400 lines of abstraction.

Line count is not the goal; unnecessary structure is the enemy.

## Gather implementation rules

Before implementing planning, voting, or notification flows, explicitly identify:

- which user/group roles are authorized,
- which fields are private vs group-visible,
- planning-run state transitions allowed by frozen contracts,
- idempotency keys or natural keys for runs, votes, and confirmations,
- timezone/date semantics **only** as approved in contracts (do not invent).

For API handlers:

- validate Supabase session before business logic,
- map auth user to membership before group-scoped reads/writes,
- return contract-shaped errors; do not leak stack traces or internal IDs unnecessarily,
- invoke `PlannerPort` only with authorized, privacy-filtered `PlannerInput`.

For planner code:

- keep provider adapters behind an internal boundary (Creao-specific types must not leak to API),
- enforce execution budgets/timeouts as tasks specify,
- strip unnecessary private fields before provider calls,
- deterministic scoring must be reproducible from fixtures,
- public explanations must match actual ranking inputs (no invented attendance).

For mobile code:

- treat backend as authoritative; do not cache voting outcomes that contradict API,
- use contract DTOs or generated clients from `packages/contracts` when available,
- handle OTP and permission-denied push without blocking core flows (SPEC §3).

## Scope control

The task file may specify:

- allowed files,
- may-modify files,
- forbidden areas,
- developer lane.

Honor those boundaries and SPEC exclusive directories.

If correctness requires expanding scope:

1. make the minimum additional change,
2. explain why in the handoff,
3. do not opportunistically refactor nearby code,
4. if crossing lanes or contracts, stop and escalate unless the task explicitly permits it.

Contract changes in `packages/contracts/**` are maintained by Developer 2 but require consumer review before merge.

## Responding to review/test feedback

Fix the root cause, not only the visible failing assertion.

Do not:

- weaken tests,
- suppress errors,
- add broad exception handling that swallows auth/privacy failures,
- special-case test fixtures in production code,
- expose private member fields to satisfy UI convenience,
- implement SPEC §11 open decisions to unblock a test without approval.

If review feedback conflicts with project docs, cite the conflict and escalate rather than guessing.
