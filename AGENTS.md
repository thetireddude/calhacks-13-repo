# Gather — Agent Instructions

Cal Hacks 13.0 (Meta Track). This repository uses a vendor-neutral agent workflow. The **repository**, not any chat transcript, is the source of truth.

Product and ownership rules live in [`SPEC.md`](SPEC.md). Orchestration detail: [`docs/project-dag.md`](docs/project-dag.md).

## Read order

Before changing code:

1. Read this file.
2. Read [`state/CURRENT.md`](state/CURRENT.md).
3. Read the task file assigned under `tasks/<TASK-ID>.md`.
4. Read the developer brief for your lane under [`docs/developers/`](docs/developers/) when working in an owned surface.
5. Read only the project docs and ADRs listed by that task.
6. Inspect the existing implementation before proposing changes.

Do not rely on remembered context from Codex, Claude, Cursor, or another harness when repository state disagrees with it.

## Token-efficient execution

All coding agents should apply the harness-agnostic `token-efficient-coding` skill (`.agents/skills/token-efficient-coding/SKILL.md`) when gathering repository context, using shell/Git tools, querying GitHub, and handing context between agents.

Prefer persistent repository context (`state/repo-map.md`, `state/task-context/`) and orchestrator-prepared context packs over repeated repository discovery.

Token efficiency is subordinate to correctness, privacy, contract fidelity, security, architecture validation, and test quality.

## Roles

This project defines four roles:

- **Orchestrator** — [`agents/orchestrator.md`](agents/orchestrator.md)
- **Implementer** — [`agents/implementer.md`](agents/implementer.md)
- **Reviewer** — [`agents/reviewer.md`](agents/reviewer.md)
- **Tester** — [`agents/tester.md`](agents/tester.md)

A task file defines which role acts first and whether review/testing gates are required.

## Source-of-truth hierarchy

When instructions conflict, use this order:

1. Explicit current task requirements in `tasks/<TASK-ID>.md`
2. Accepted ADRs in `docs/decisions/`
3. [`SPEC.md`](SPEC.md) (frozen product, lanes, gates, unresolved decisions)
4. Project docs under `docs/`
5. This `AGENTS.md`
6. Existing implementation conventions
7. Harness/session instructions

Do not silently override a higher-priority rule. If a task requires a deliberate architectural or contract change, follow SPEC §9 and add or update an ADR when appropriate.

## Developer lanes and branches

| Developer | Branch | Exclusive paths |
|-------------|--------|-----------------|
| Developer 1 — Mobile | `feature/mobile` | `apps/mobile/**` |
| Developer 2 — Core API | `feature/core-api` | `apps/api/**`, `supabase/**`, `packages/contracts/**` |
| Developer 3 — Planner | `feature/planner` | `packages/planner/**` |

**Shared root configuration** (workspace manifest, lockfile, CI, root TypeScript config) requires the **integration owner** once assigned. Until then, coordinate via tasks; do not make competing root changes.

Cross-lane rules (SPEC §7.3):

- Mobile imports shared API DTOs from `packages/contracts`, not backend internals.
- Backend imports the planner public entry point only, not private planner modules.
- Planner imports shared types only; no database or UI code.
- Backend owns all persistence; planner does not modify votes or confirmed events.
- No circular dependencies across packages.

## Core engineering principles

- Prefer the smallest implementation that fully satisfies the task.
- Do not add abstractions for hypothetical future requirements.
- Do not refactor unrelated code.
- Do not create framework-like helpers for a single use.
- Prefer a simple function over a class when stateful behavior is unnecessary.
- Prefer existing dependencies over adding new ones.
- Prefer explicit readable code over clever indirection.
- Keep module boundaries clear so parallel feature branches are easy to merge.
- Do not modify files outside the task's allowed surface unless required for correctness.
- Do not modify another developer's exclusive paths without agreement (SPEC §9).
- If additional files must change, explain why in the task handoff.
- Do not rewrite files merely for style.
- Do not add TODO scaffolding that is not required by the current task.
- Avoid speculative configuration.
- Avoid dependency injection, factories, base classes, registries, plugin systems, and generic repositories unless a concrete current requirement needs them.
- Do not guess unresolved SPEC items (SPEC §11); record blockers in `state/CURRENT.md`.

## Privacy and security rules (non-negotiable)

- Never expose another member's private availability or raw preference history to other members or public proposal text.
- Respect learning opt-out; do not use opted-out history in planner inputs or rankings.
- Validate and filter model/agent outputs before persistence or client display.
- Provider credentials and secrets stay out of git; use `.env.example` and local `.env` only.
- Authentication and group membership must gate every protected endpoint and authorized planner input.
- Return only group-visible planning information permitted by SPEC and frozen DTOs.
- AI outputs must not reveal private calendar details, private histories, or identifiable sensitive attributes.

## Planner and product boundary rules

The planner package exposes a documented entry point (`PlannerPort` in SPEC §6.3):

- Accepts authorized `PlannerInput`; returns schema-validated `PlannerResult`.
- Returns at most three ranked proposals; deterministic scoring uses **approved** weights only.
- Does **not** persist data, open voting, modify votes, or confirm events.

AI may explain rankings and tradeoffs; it may **not** decide eligibility, manipulate votes, override deterministic scores, invent attendance, or override hard constraints.

Approved category weights (fixed until SPEC changes): expected attendance 45%, shared preference fit 30%, budget/travel fit 15%, inclusion fairness 10%. Do not implement unapproved score formulas, normalization, tie-breakers, or inclusion decay and label them approved.

## Backend and voting rules

- Explicit **veto** must remain distinct from **Can't make it** once behavior is approved in SPEC.
- Voting deadlines, majority denominators, and revote rules are not guessed—implement only after contract/ADR approval.
- Confirmation must be idempotent under concurrent votes (no duplicate confirmations).
- Scheduled planning runs must not duplicate for the same group and planning window.
- Planner failures must leave planning-run state recoverable (no corrupted partial votes/proposals without documented recovery).

## Data and API rules

- Supabase migrations are Developer 2's surface; planner and mobile do not author schema.
- Raw third-party discovery payloads should be treated as immutable inputs to normalization where archived; normalization logic must be reproducible from fixtures.
- API idempotency and clear error schemas matter for mobile retries and OTP flows.
- Date/time, timezone, budget/currency, and availability formats follow **frozen** contract decisions—not ad hoc strings per layer.
- All cross-package joins (user ↔ membership ↔ group ↔ run ↔ proposal ↔ vote) must have explicit cardinality expectations in tests.

## Testing rules

Every behavior-changing task must add or update focused tests unless the task is documentation-only.

**CI parity:** Developer 2 gates must run root **`pnpm run test:ci`** in the candidate worktree before Tester PASS or merge. That script is what `.github/workflows/ci.yml` runs; Implementer, Tester, and CI must not diverge.

At minimum, consider:

- unit tests for deterministic transforms and scoring,
- integration tests across module boundaries (API ↔ planner port, API ↔ Supabase),
- contract tests for DTO round-trips and schema validation,
- privacy tests (forbidden fields absent from responses),
- concurrency/idempotency tests for voting and scheduling where applicable,
- regression tests for previously discovered bugs.

Lane defaults:

- Developer 1: API mock fixtures matching approved contracts; no client-only voting/fairness rules.
- Developer 2: mock `PlannerPort`; no live Creao/Bright Data required for core CI.
- Developer 3: frozen planner input fixtures; reproducible deterministic scoring; provider-failure paths.

Tests must verify behavior, not implementation trivia.

Do not weaken or delete a failing test merely to make a task pass unless the test is demonstrably incorrect and the reason is documented.

## Worktree policy

The **Orchestrator owns worktree lifecycle**.

Workers should normally be told they are already in the correct isolated worktree or feature branch.

Do not let worker agents recursively create arbitrary worktrees unless the current harness requires it and the task explicitly permits it.

Use one worktree per independent PR-sized task when supported.

Recommended branch naming:

`agent/<TASK-ID>-<short-slug>`

Long-lived lane branches (SPEC §7.1): `feature/mobile`, `feature/core-api`, `feature/planner`.

Examples:

- `agent/GATE0-001-monorepo-scaffold`
- `agent/GATE0-002-contract-stubs`
- `agent/DEV2-010-voting-idempotency`

Do not create worktrees for trivial edits.

Do not merge a task until required review and test gates pass.

## Parallelism policy

Tasks may run in parallel only when:

- all declared dependencies are complete,
- their allowed file surfaces do not materially overlap,
- they do not depend on an unstable shared contract (`packages/contracts` before freeze),
- their integration point is owned by a later task.

If two tasks would both heavily edit the same module, sequence them or split ownership more cleanly.

## Completion gate

A task is complete only when all required conditions hold:

- acceptance criteria are satisfied,
- relevant tests pass,
- required reviewer has no open P0/P1 findings,
- required tester has no unexplained failing tests,
- no known privacy leak or unapproved contract drift remains,
- task handoff is written,
- `state/CURRENT.md` is updated when project state changes.

## Handoff format

At the end of work, report:

- task ID,
- summary of changes,
- files changed,
- commands/tests run,
- pass/fail status,
- known limitations,
- reviewer/tester follow-ups if any,
- whether an ADR, contract version bump, or project-state update is needed.

Keep handoffs factual and concise.

## Git policy

Implementers may commit changes inside their assigned task branch/worktree.

Commit only when:

- the task is in a coherent candidate state,
- relevant tests have been run,
- unrelated changes are excluded.

Use task-prefixed commit messages:

```text
GATE0-001: add pnpm workspace scaffold
GATE0-002: stub PlannerPort and core DTOs
DEV2-012: enforce voting deadline on proposals
```

Reviewer agents should not commit production fixes.

Tester agents may commit test-only changes when operating on a dedicated test branch/worktree.

The Orchestrator (or integration owner) owns merging to the integration branch.

Workers must never push directly to `main`.

Workers must not force-push, reset shared branches, or rewrite unrelated history.

Each PR must contain (SPEC §7.4): summary, owned paths modified, contract changes if any, environment variables introduced, tests run, integration dependencies, known unresolved issues.

Contract-breaking changes require agreement before merging. A successful Git merge is not sufficient proof of integration (SPEC §9).
