# DEV2-025 — Demo seed notes (no secrets)

## Status

implementing

## Dependencies

- DEV2-017

## Execution

Primary role: implementer  
Review required: yes  
Tester required: no  
Worktree required: yes  
Developer lane: core-api

## Goal

Document how to seed a demo group **after** Auth users exist in the cloud project. No committed secrets, no live credentials.

## Allowed files

- `docs/dev2-demo-seed.md` (new)
- `supabase/README.md` — one link

## Do not modify

- `apps/mobile/**`, API src
- Do not add a script that embeds service-role keys

## Requirements

Steps: create 2 users in Auth dashboard → copy UUIDs → SQL or curl examples using service role **placeholders** to insert profiles/memberships (or “sign in and use POST /v1/groups”). Mention JWT from Auth for curl. Never print real keys.

## Handoff

Commit `DEV2-025:`, status `candidate`, no merge.
