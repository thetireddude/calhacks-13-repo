# DEV2-004 — Retro review gate (main)

**Task:** Schema: preferences and availability  
**Scope reviewed:** `supabase/migrations/20261024180100_preferences_availability.sql`, `supabase/README.md` (private vs group-visible documentation)  
**Reviewer role:** Gather Reviewer (`agents/reviewer.md`)

## 1. Verdict

**APPROVE**

## 2. Findings (P0 → P3)

No P0, P1, or P2 findings.

### P3 — Documentation layout (`supabase/README.md`)

- **Severity:** P3  
- **Area:** `supabase/README.md`  
- **Issue:** `member_preferences` and `member_availability` are listed under the “Migrations (DEV2-003)” section rather than a DEV2-004 subsection. Content is correct (“Private — owner only (RLS)”).  
- **Why it matters:** Minor discoverability for parallel lanes; not a privacy or contract issue.  
- **Fix (optional):** Add a short “Migrations (DEV2-004)” header when touching README next.

## 3. Private RLS assessment

| Check | Result |
|-------|--------|
| RLS enabled on both tables | Yes (`alter table ... enable row level security`) |
| No group-member or co-member read path | Yes — policies key only on `auth.uid() = user_id`, not group membership |
| Cross-user write blocked | Yes — `with check (auth.uid() = user_id)` on `for all` |
| Operations covered | Yes — single owner-only policy per table for all commands |
| FK ownership | Yes — `user_id` → `profiles(id)` consistent with DEV2-003 |
| `learning_opt_in` present | Yes — supports SPEC privacy / opt-out persistence |

**Failure modes considered:** Another group member querying PostgREST with their own JWT cannot `select`, `insert`, `update`, or `delete` rows where `user_id` ≠ their uid. Unauthenticated clients (`auth.uid()` null) do not satisfy `using` / `with check`. Service-role bypass is expected Supabase behavior; API layers must not expose other members’ rows (DEV2-006 privacy tests).

Policies are appropriately stricter than DEV2-003 group-visible stubs: fully private tables use owner-only `for all` rather than membership-based `select`.

## 4. Missing tests

- No automated RLS or migration tests in-repo for DEV2-004 (acceptable for this migration-only task).  
- **Follow-up:** DEV2-006 should add API/integration privacy tests (“private availability is not exposed to other members”, SPEC acceptance checklist).

## 5. Architecture / contract drift

- None. Tables align with SPEC §4 logical resources (preferences, availability) and SPEC §6 privacy (“restrict member access to private preferences and availability”).  
- No planner, mobile, or contract changes in scope.

## 6. Gate summary

| Gate | Status |
|------|--------|
| Reviewer | **APPROVE** (this file) |
| Tester | Pending orchestration (schema apply / CI as defined for Dev 2 spine) |
