import { readdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import assert from "node:assert/strict";

const migrationsDir = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../supabase/migrations",
);

function migrationSql(nameFragment: string): string {
  const file = readdirSync(migrationsDir).find((f) => f.includes(nameFragment));
  assert.ok(file, `missing migration matching ${nameFragment}`);
  return readFileSync(join(migrationsDir, file), "utf8");
}

test("DEV2-003: identity and groups migration defines core tables and RLS", () => {
  const sql = migrationSql("identity_and_groups");
  for (const token of [
    "profiles",
    "groups",
    "group_memberships",
    "group_invitations",
    "enable row level security",
  ]) {
    assert.match(sql, new RegExp(token, "i"), `expected ${token} in DEV2-003 SQL`);
  }
});

test("DEV2-004: preferences and availability migration is member-private", () => {
  const sql = migrationSql("preferences_availability");
  for (const token of [
    "member_preferences",
    "member_availability",
    "prefs_own_only",
    "availability_own_only",
  ]) {
    assert.match(sql, new RegExp(token, "i"), `expected ${token} in DEV2-004 SQL`);
  }
});

test("DEV2-007: planning runs and proposals migration with member policies", () => {
  const sql = migrationSql("planning_runs");
  for (const token of ["planning_runs", "proposals", "enable row level security"]) {
    assert.match(sql, new RegExp(token, "i"), `expected ${token} in DEV2-007 SQL`);
  }
});

test("migrations apply in chronological order (filename timestamps)", () => {
  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  assert.ok(files.length >= 3, "expected at least three migration files");
  const stamps = files.map((f) => f.slice(0, 14));
  const sorted = [...stamps].sort();
  assert.deepEqual(stamps, sorted, "migration filenames should be ordered by timestamp");
});
