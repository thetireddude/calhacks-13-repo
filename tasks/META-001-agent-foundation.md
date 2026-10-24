# META-001 — Agent and repository foundation

## Status

done

## Dependencies

None.

## Execution

Primary role: implementer  
Review required: no  
Tester required: no  
Worktree required: no  
Developer lane: integration

## Goal

Install vendor-neutral agent instructions, role definitions, task graph, state handoff, developer briefs, and monorepo directory scaffold for Gather.

## Read first

- `SPEC.md`
- `docs/project_execution_contract.md`

## Allowed files

- `AGENTS.md`, `agents/`, `docs/`, `tasks/`, `state/`, `.agents/`
- Scaffold placeholders under `apps/`, `packages/`, `supabase/`
- `README.md`, `.cursor/`

## Do not modify

- Application business logic (none yet)

## Acceptance criteria

- All referenced paths exist and cross-link correctly.
- `state/CURRENT.md` lists Gate 0 as current milestone and next tasks.
- Developer briefs exist for all three lanes.

## Handoff

Foundation committed; next implementer tasks: `GATE0-001`, `GATE0-002`, then `DEV*-001`.
