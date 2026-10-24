# Gather — Agent Instructions

Cal Hacks 13.0 (Meta Track). The **repository** is the source of truth—not any chat transcript.

Product and ownership rules live in [`SPEC.md`](SPEC.md). This file defines how coding agents work here.

## Read order

Before changing code:

1. Read this file.
2. Read [`state/CURRENT.md`](state/CURRENT.md).
3. Read the task assigned under `tasks/<TASK-ID>.md`.
4. Read the developer brief that matches your lane (see [`docs/developers/`](docs/developers/)).
5. Read only the docs and ADRs listed by that task.
6. Inspect existing implementation before proposing changes.

Do not rely on remembered context from Codex, Claude, Cursor, or another harness when repository state disagrees with it.

## Token-efficient execution

Apply the harness-agnostic `token-efficient-coding` skill (`.agents/skills/token-efficient-coding/SKILL.md`) when gathering context, using shell/Git tools, and handing work between agents.

Prefer `state/repo-map.md`, `state/task-context/<TASK-ID>.md`, and orchestrator-prepared context packs over repeated repository discovery.

Token efficiency is subordinate to correctness, privacy, contract fidelity, security, and test quality.

## Roles

| Role | Definition |
|------|------------|
| Orchestrator | [`agents/orchestrator.md`](agents/orchestrator.md) |
| Implementer | [`agents/implementer.md`](agents/implementer.md) |
| Reviewer | [`agents/reviewer.md`](agents/reviewer.md) |
| Tester | [`agents/tester.md`](agents/tester.md) |

Task files state which role runs first and whether review/testing gates are required.

## Source-of-truth hierarchy

When instructions conflict:

1. Explicit requirements in `tasks/<TASK-ID>.md`
2. Accepted ADRs in `docs/decisions/`
3. [`SPEC.md`](SPEC.md) (frozen product/ownership contract)
4. Project docs under `docs/`
5. This `AGENTS.md`
6. Existing implementation conventions
7. Harness/session instructions

Do not silently override a higher-priority rule. Contract or architecture changes require affected-developer agreement and usually an ADR.

## Developer lanes and branches

| Developer | Branch | Exclusive paths |
|-------------|--------|-----------------|
| Developer 1 — Mobile | `feature/mobile` | `apps/mobile/**` |
| Developer 2 — Core API | `feature/core-api` | `apps/api/**`, `supabase/**`, `packages/contracts/**` |
| Developer 3 — Planner | `feature/planner` | `packages/planner/**` |

**Shared root configuration** (workspace manifest, lockfile, CI, root TypeScript config) requires the **integration owner** once assigned. Until then, coordinate in tasks and do not make competing root changes.

Cross-lane rules (from SPEC):

- Mobile imports shared API DTOs from `packages/contracts`, not backend internals.
- Backend imports the planner public entry point only, not private planner modules.
- Planner imports shared types only; no database or UI code.
- Backend owns all persistence; planner does not modify votes or confirmed events.

## Core engineering principles

- Prefer the smallest implementation that fully satisfies the task.
- Do not add abstractions for hypothetical future requirements.
- Do not refactor unrelated code or files outside another developer's lane without agreement.
- Honor task **allowed files** / **do not modify** lists.
- Do not guess unresolved SPEC items (see SPEC §11); record blockers in `state/CURRENT.md`.

## Privacy and security rules (non-negotiable)

- Never expose another member's private availability or raw preference history.
- Respect learning opt-out; do not use opted-out history in planner inputs.
- Validate and filter AI outputs before persistence or display.
- Provider credentials and secrets stay out of git; use environment templates only.
- Authentication and group membership checks must gate protected data.

## Planner boundary

The planner package exposes a documented entry point (proposed `PlannerPort` in SPEC §6.3). It:

- Accepts authorized `PlannerInput`, returns schema-validated `PlannerResult`.
- Performs agent evaluations, discovery, deterministic scoring, and privacy-safe explanations.
- Does **not** persist data, modify votes, or confirm events.

AI may explain rankings; it may **not** decide eligibility, manipulate votes, override deterministic scores, invent attendance, or reveal private histories.

Approved category weights (fixed): attendance 45%, shared preference 30%, budget/travel 15%, inclusion fairness 10%. Do not implement unapproved score formulas and label them approved.

## Testing rules

Every behavior-changing task must add or update focused tests unless documentation-only.

- Developer 1: API mock fixtures matching frozen contracts.
- Developer 2: mock `PlannerPort`; no live Creao/Bright Data required for core tests.
- Developer 3: frozen planner input fixtures; reproducible deterministic scoring tests.

Do not weaken or delete a failing test to make a task pass unless the test is wrong and the reason is documented.

## Worktree policy

The **Orchestrator** owns worktree lifecycle. One worktree per independent PR-sized task when supported.

Recommended branch naming:

```text
agent/<TASK-ID>-<short-slug>
```

Examples: `agent/GATE0-001-monorepo-scaffold`, `agent/CONTRACT-001-planner-port`

Workers must not push directly to `main`, force-push shared branches, or rewrite unrelated history.

## Parallelism policy

Tasks may run in parallel only when:

- declared dependencies are complete,
- allowed file surfaces do not materially overlap,
- they do not depend on an unstable shared contract,
- integration is owned by a later task.

## Completion gate

A task is complete only when:

- acceptance criteria are satisfied,
- relevant tests pass,
- required reviewer has no open P0/P1 findings,
- required tester has no unexplained failing tests,
- handoff is written,
- `state/CURRENT.md` is updated when project state changes.

## Handoff format

Report: task ID, summary, files changed, commands/tests run, pass/fail, known limitations, reviewer/tester follow-ups, whether an ADR or state update is needed.

## Git policy

Use task-prefixed commit messages, e.g. `GATE0-001: add workspace scaffold`.

Implementers commit on task branches. Reviewers do not commit production fixes unless explicitly assigned. The Orchestrator (or integration owner) owns merges to integration branches.

Each PR must include: summary, owned paths, contract changes, new env vars, tests run, integration dependencies, known unresolved issues (per SPEC §7.4).
