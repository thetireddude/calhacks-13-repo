# Task Context Packs

Orchestrator-prepared compact context for Implementer, Reviewer, and Tester.

## Location

`state/task-context/<TASK-ID>.md`

## Schema

See `.agents/skills/token-efficient-coding/references/context-pack.md`.

## Usage

1. Orchestrator creates the pack before dispatch.
2. Downstream agents start from the pack; expand discovery only when correctness requires it.
3. Archive or delete packs when tasks merge.
