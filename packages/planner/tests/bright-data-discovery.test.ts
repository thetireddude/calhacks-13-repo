import assert from "node:assert/strict";
import test from "node:test";

import { normalizeFacebookEventRecords, normalizeYelpRecords } from "../src/bright-data-discovery.js";

test("Yelp normalization retains only complete public records", () => {
  const candidates = normalizeYelpRecords([
    { name: "Neighborhood Cafe", url: "https://www.yelp.com/biz/neighborhood-cafe", city: "San Francisco", categories: "Cafe", price: "$$" },
    { name: "Missing URL" },
  ], "San Francisco, CA");
  assert.equal(candidates.length, 1);
  assert.equal(candidates[0]?.source, "yelp");
  assert.equal(candidates[0]?.title, "Neighborhood Cafe");
});

test("Facebook venue-event normalization retains public event details", () => {
  const candidates = normalizeFacebookEventRecords([{
    event_name: "Outdoor Music Night",
    event_url: "https://www.facebook.com/example/events/1",
    venue_name: "Example Venue",
    start_date: "2026-11-01T19:00:00-07:00",
    is_free: true,
  }], "San Francisco, CA");
  assert.equal(candidates.length, 1);
  assert.equal(candidates[0]?.source, "facebook_events");
  assert.equal(candidates[0]?.isFree, true);
});
