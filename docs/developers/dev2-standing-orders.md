# Developer 2 — standing orders (read-only)

**Audience:** Cursor / coding agents working **for Developer 2**.  
**This file does not change product rules.** [`AGENTS.md`](../../AGENTS.md) and [`SPEC.md`](../../SPEC.md) still win.

Use this when the human says “keep going,” “orchestrate,” “dispatch,” or leaves the next slice implied.

## Default: auto-drive

Do **not** pause for permission, preference, or “want me to continue?”

After a candidate lands, immediately run the next legal step:

1. Reviewer (P0/P1)
2. Tester with **`pnpm run test:ci`** in the **task worktree** at the candidate commit
3. Merge only after both gates pass
4. Update `state/CURRENT.md`, `tasks/index.md`, and `state/agents/<TASK-ID>.md`
5. File and dispatch the next ready Dev 2 task(s)

Orchestrator **dispatches**; Implementers **write code**. Do not implement feature code on `main` as orchestrator. Do not touch `apps/mobile/**` or `packages/planner/**` unless the human explicitly expands the lane.

Stay on Dev 2 surfaces: `apps/api/**`, `supabase/**`, `packages/contracts/**` (contract changes still need consumer agreement per SPEC §6.1 / §9).

## Stop only for a burning question

Ask the human **only** when you cannot proceed correctly without an answer you cannot derive from the repo. A burning question is one of:

- Unresolved **SPEC §11** (voting rules, deadlines, majority, scheduler, etc.) — **do not guess**; record the blocker in `state/CURRENT.md`
- **Contract-breaking** change that needs another lane’s agreement
- **Lane conflict** (would edit another developer’s exclusive paths)
- **Secret / security** decision (what to put in git, how to handle keys)
- **Ambiguous ownership** of a shared root file (workspace, lockfile, CI) with no integration owner
- A gate is **blocked** and the next step is not defined in `AGENTS.md` / the task file

When you stop: one short question, the decision needed, and what you will do the moment it is answered. Do not offer a menu of optional work.

Not burning (keep going): merge order among non-overlapping tasks, worktree names, whether to run reviewer after implementer, whether to start the next persistence slice, doc/test-count nits, “should I update CURRENT.md?”

## Parallelize where `AGENTS.md` allows

Run independent ready tasks **in parallel**. Sequence only when required.

Parallel is allowed only if **all** of these hold ([`AGENTS.md`](../../AGENTS.md) Parallelism policy):

- Declared dependencies are complete
- Allowed file surfaces do **not** materially overlap
- No dependency on an unstable shared contract (`packages/contracts` before freeze)
- Integration of the two tasks is owned by a later task

If two tasks would heavily edit the same module, sequence them or split ownership.

Orchestrator workflow ([`agents/orchestrator.md`](../../agents/orchestrator.md)):

1. Find ready tasks; reject SPEC §11 / missing-ADR blockers
2. One worktree + `agent/<TASK-ID>-<slug>` per independent PR-sized task
3. Write `state/task-context/<TASK-ID>.md` before dispatch
4. Dispatch Implementer → Reviewer → Tester
5. Merge after gates; unlock the next nodes

Preferred merge order when parallel work finishes close together: **docs first**, then smaller isolated diffs, then the largest overlapping surface last.

## Correctness checklist (from `AGENTS.md`)

Read before changing code:

1. `AGENTS.md`
2. `state/CURRENT.md`
3. `tasks/<TASK-ID>.md`
4. [`developer-2-backend.md`](developer-2-backend.md)
5. Only the docs/ADRs the task lists
6. Existing implementation

Then:

- Smallest change that satisfies the task; no speculative abstractions
- Privacy / auth / membership gates are non-negotiable
- Do not invent voting, scoring, or planner rules
- Every behavior-changing task updates focused tests
- Tester PASS is invalid without `pnpm run test:ci` on the candidate
- Implementers commit on the task branch; workers never push `main`
- Do not force-push, rewrite shared history, or skip review/test gates
- Task is complete only when acceptance, tests, reviewer, tester, handoff, and state update are done

## Current implied queue (until task files exist)

If nothing is in flight, auto-file and dispatch the next Gate 2 persistence wave (env-gated Supabase, in-memory CI default), parallel where surfaces do not overlap:

| Task | Slice | Parallel? |
|------|--------|-----------|
| DEV2-014 | `GET /v1/me` + `profiles` upsert when admin client exists | ∥ DEV2-015 |
| DEV2-015 | prefs + availability persistence | ∥ DEV2-014 |
| DEV2-016 | planning runs + proposals persistence | after 014/015 |
| DEV2-017 | votes / vetoes / confirmed events persistence | after 016 |

Do not implement unapproved majority/veto/deadline behavior in 017 — keep Gate 1 stub semantics.
