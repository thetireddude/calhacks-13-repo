import assert from "node:assert/strict";
import test from "node:test";

import { normalizeFacebookEventRecords, normalizeYelpRecords } from "../src/bright-data-discovery.js";
import { BrightDataCandidateDiscovery } from "../src/bright-data-discovery.js";
import { BrightDataDatasetClient } from "../src/bright-data.js";

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

test("Facebook discovery sends only explicitly supplied public venue URLs", async () => {
  let requestBody = "";
  const client = new BrightDataDatasetClient({ apiKey: "test" }, async (_url, init) => {
    requestBody = String(init?.body);
    return new Response(JSON.stringify([{ event_name: "Music", event_url: "https://facebook.com/events/1" }]), { status: 200 });
  });
  const discovery = new BrightDataCandidateDiscovery(client, {
    facebookEventsVenueDatasetId: "gd_facebook",
    facebookVenueUrls: ["https://www.facebook.com/example-venue/events"],
  });
  const candidates = await discovery.discover({ city: "San Francisco", limit: 1 });
  assert.equal(candidates.length, 1);
  assert.match(requestBody, /example-venue\/events/);
  assert.doesNotMatch(requestBody, /upcoming_events_only/);
});

test("Yelp discovery sends a public search URL to the configured URL collector", async () => {
  let requestBody = "";
  const client = new BrightDataDatasetClient({ apiKey: "test" }, async (_url, init) => {
    requestBody = String(init?.body);
    return new Response(JSON.stringify([{ name: "Cafe", url: "https://www.yelp.com/biz/cafe" }]), { status: 200 });
  });
  const discovery = new BrightDataCandidateDiscovery(client, { yelpDatasetId: "gd_yelp" });
  const candidates = await discovery.discover({ city: "San Francisco, CA", limit: 1 });
  assert.equal(candidates.length, 1);
  assert.match(requestBody, /www\.yelp\.com\/search/);
  assert.match(requestBody, /find_desc=Restaurants/);
});
