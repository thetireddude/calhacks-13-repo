# DEV3-004 — Verify Creao/Claude Haiku provider adapter

## Status

blocked

## Dependencies

- DEV3-003

## Execution

Primary role: implementer

Review required: yes

Tester required: yes

Worktree required: yes

Developer lane: planner

## Goal

Verify the approved `anthropic/claude-haiku-4-5` Creao adapter against a non-production app and prove its failure modes remain safe.

## Blocker

The project owner must provide a non-committed Creao API key/app ID and confirm API Trigger access/available credits. No secret may enter git, test fixtures, or logs.

## Allowed files

- `packages/planner/**`
- `.env.example` documentation only

## Requirements

- Enforce bounded polling, timeout, retry/backoff, and structured-output validation.
- Send only ADR-002-authorized provider input.
- Provider failure must surface as a safe recoverable error; it must not create fabricated evaluations.

## Acceptance criteria

- A manually verified non-production invocation returns a validated constrained evaluation.
- Failure/429/timeout tests pass without live credentials.
- Logs and committed files contain no credentials or sensitive member data.

## Required tests

- 401/403, 429, timeout, malformed output, failed/cancelled run.
- Input privacy allowlist fixture.

## Handoff

State verification environment (without secrets), model/app configuration, observed latency/credit use, and fallback behavior.
