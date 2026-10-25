# DEV3-005 — Verify Bright Data discovery and seeded fallback

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

Verify the approved on-demand Bright Data discovery path for Yelp and known public Facebook venues, while keeping seeded discovery reliable when live collection fails.

## Blocker

The project owner must provide a non-committed Bright Data development credential/dataset access and confirm permitted collector IDs. Google Maps Street View, Funcheap, and DoTheBay are out of scope per ADR-002.

## Allowed files

- `packages/planner/**`
- `.env.example` documentation only

## Requirements

- Normalize title, city, future date/time, public URL, price/location metadata, and source type.
- Reject candidates missing the ADR-002-required URL/title/city/future date-time fields.
- Never persist raw third-party payloads through application APIs.
- Use seeded fallback on any live-source failure.

## Acceptance criteria

- Non-production live query yields schema-valid candidates or a documented safe fallback.
- Fixtures cover incomplete/malformed provider records and preserve reproducibility.
- No credentials or raw private user data are committed.

## Required tests

- Yelp and Facebook normalization fixtures.
- Missing required field, provider failure, and fallback fixtures.

## Handoff

State sources verified, collector configuration without secrets, fallback evidence, and any source-data limitations.
