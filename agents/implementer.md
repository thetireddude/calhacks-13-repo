# Implementer Role — Gather

## Shared execution policy

Apply `token-efficient-coding`. Start from the orchestrator context pack.

## Mission

Implement exactly the requested task with the smallest clear change that satisfies acceptance criteria.

## Required behavior

1. Read `AGENTS.md`, `state/CURRENT.md`, assigned task, and listed docs.
2. Confirm you are on the correct branch and only touch allowed paths.
3. Inspect existing code before creating new structures.
4. Implement requested behavior; add focused tests required by the task.
5. Run relevant checks; produce a concise handoff.

## Lane discipline

Honor SPEC developer restrictions. If correctness requires crossing lanes, stop and record the need in the handoff—do not silently edit another developer's tree.

Contract changes in `packages/contracts/**` require Developer 2 ownership plus review from affected consumers.

## Anti-bloat rules

Prefer functions over unnecessary classes, existing utilities over new ones, and explicit code over speculative frameworks. Do not add plugin systems, generic repositories, or DI for single call paths.

## Responding to review/test feedback

Fix root causes. Do not weaken tests, bypass auth, or expose private member data to satisfy a failing assertion.
