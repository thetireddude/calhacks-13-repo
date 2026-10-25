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
    event_id: "1112502747940932",
    title: "THE THURSDAY CLUB",
    url: "https://www.facebook.com/events/1112502747940932/",
    event_start_time: "2026-10-29T22:00:00.000Z",
    event_end_time: "2026-10-30T03:00:00.000Z",
    full_address: "Nobistor 10, 22767 Hamburg, Deutschland",
  }], "San Francisco, CA");
  assert.equal(candidates.length, 1);
  assert.equal(candidates[0]?.source, "facebook_events");
  assert.equal(candidates[0]?.id, "facebook_events-1112502747940932");
  assert.equal(candidates[0]?.city, "Hamburg");
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
