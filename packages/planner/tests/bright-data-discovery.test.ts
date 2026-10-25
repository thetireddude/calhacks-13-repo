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

test("Yelp normalization accepts the observed discovery response shape without retaining contact data", () => {
  const candidates = normalizeYelpRecords([{
    name: "Cafe Canela Restaurant",
    url: "https://www.yelp.com/biz/cafe-canela-restaurant-galveston-2",
    categories: ["Mexican"],
    price_range: "$$",
    address: { City: "Galveston", Country: "US" },
    full_address: "6105 Stewart Rd, Ste C, Galveston, TX 77551",
    phone_number: "(409) 443-5307",
    owner_name: "Excluded",
  }], "San Francisco, CA");

  assert.equal(candidates.length, 1);
  assert.equal(candidates[0]?.title, "Cafe Canela Restaurant");
  assert.equal(candidates[0]?.category, "Mexican");
  assert.equal(candidates[0]?.venueName, "Cafe Canela Restaurant");
  assert.equal(candidates[0]?.city, "Galveston");
  assert.equal(candidates[0]?.priceText, "$$");
  assert.equal(candidates[0]?.source, "yelp");
  assert.equal("phone_number" in (candidates[0] ?? {}), false);
  assert.equal("owner_name" in (candidates[0] ?? {}), false);
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

test("Facebook discovery uses Bright Data's discover-by-venue method", async () => {
  let requestBody = "";
  const client = new BrightDataDatasetClient({ apiKey: "test" }, async (_url, init) => {
    requestBody = String(init?.body);
    return new Response(JSON.stringify([{ event_name: "Music", event_url: "https://facebook.com/events/1" }]), { status: 200 });
  });
  const discovery = new BrightDataCandidateDiscovery(client, {
    facebookEventsVenueDatasetId: "gd_facebook",
    facebookVenueNames: ["NOHO"],
  });
  const candidates = await discovery.discover({ city: "San Francisco", limit: 1 });
  assert.equal(candidates.length, 1);
  assert.match(requestBody, /"venue":"NOHO"/);
  assert.doesNotMatch(requestBody, /upcoming_events_only/);
});

test("Yelp discovery uses Bright Data's discover-by-search-filters method", async () => {
  let requestBody = "";
  let requestUrl = "";
  const client = new BrightDataDatasetClient({ apiKey: "test" }, async (url, init) => {
    requestUrl = url;
    requestBody = String(init?.body);
    return new Response(JSON.stringify([{ name: "Cafe", url: "https://www.yelp.com/biz/cafe" }]), { status: 200 });
  });
  const discovery = new BrightDataCandidateDiscovery(client, { yelpDatasetId: "gd_yelp" });
  const candidates = await discovery.discover({ city: "San Francisco, CA", limit: 1 });
  assert.equal(candidates.length, 1);
  assert.match(requestBody, /"category":"Restaurants"/);
  assert.match(requestBody, /"location":"San Francisco, CA"/);
  assert.match(requestUrl, /type=discover_new/);
  assert.match(requestUrl, /discover_by=search_filters/);
});
