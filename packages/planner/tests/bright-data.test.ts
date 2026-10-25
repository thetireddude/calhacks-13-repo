import assert from "node:assert/strict";
import test from "node:test";

import { BrightDataDatasetClient, BrightDataRequestError } from "../src/bright-data.js";

test("Bright Data client sends authenticated dataset requests", async () => {
  let capturedUrl = "";
  let capturedInit: RequestInit | undefined;
  const client = new BrightDataDatasetClient(
    { apiKey: "test-key" },
    async (url, init) => {
      capturedUrl = url;
      capturedInit = init;
      return new Response(JSON.stringify([{ title: "Event" }]), { status: 200 });
    },
  );

  const records = await client.scrape({ datasetId: "gd_example", input: [{ location: "San Francisco" }] });

  assert.equal(records.length, 1);
  assert.match(capturedUrl, /dataset_id=gd_example/);
  assert.equal(capturedInit?.headers && (capturedInit.headers as Record<string, string>).Authorization, "Bearer test-key");
});

test("Bright Data client fails closed on a non-array response", async () => {
  const client = new BrightDataDatasetClient(
    { apiKey: "test-key" },
    async () => new Response(JSON.stringify({ id: "snapshot" }), { status: 200 }),
  );

  await assert.rejects(
    client.scrape({ datasetId: "gd_example", input: [{ location: "San Francisco" }] }),
    BrightDataRequestError,
  );
});

test("Bright Data client forwards an approved discovery method and limit", async () => {
  let capturedUrl = "";
  let capturedBody = "";
  const client = new BrightDataDatasetClient(
    { apiKey: "test-key" },
    async (url, init) => {
      capturedUrl = url;
      capturedBody = String(init?.body);
      return new Response(JSON.stringify([]), { status: 200 });
    },
  );
  await client.scrape({
    datasetId: "gd_example",
    query: { type: "discover_new", discover_by: "venue" },
    input: [{ venue: "NOHO" }],
    limitPerInput: 1,
  });
  assert.match(capturedUrl, /type=discover_new/);
  assert.match(capturedUrl, /discover_by=venue/);
  assert.match(capturedBody, /limit_per_input/);
});
