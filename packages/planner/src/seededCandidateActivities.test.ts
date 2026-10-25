import assert from "node:assert/strict";
import test from "node:test";
import {
  pickSeededCandidates,
  SEEDED_CANDIDATE_ACTIVITIES,
} from "./seededCandidateActivities.js";

test("seeded catalog exposes stable activity ids", () => {
  const ids = SEEDED_CANDIDATE_ACTIVITIES.map((a) => a.activityId);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(ids.every((id) => id.startsWith("seed-act-")));
});

test("pickSeededCandidates returns up to three deterministically", () => {
  const a = pickSeededCandidates({ activityRequest: "dinner downtown" });
  const b = pickSeededCandidates({ activityRequest: "dinner downtown" });
  assert.deepEqual(a, b);
  assert.ok(a.length >= 1);
  assert.ok(a.length <= 3);
  assert.equal(a[0]?.activityId, "seed-act-dinner-01");
});

test("pickSeededCandidates without request uses catalog order by id", () => {
  const picked = pickSeededCandidates({});
  const sorted = [...SEEDED_CANDIDATE_ACTIVITIES]
    .sort((x, y) => x.activityId.localeCompare(y.activityId))
    .slice(0, 3);
  assert.deepEqual(
    picked.map((p) => p.activityId),
    sorted.map((p) => p.activityId),
  );
});
