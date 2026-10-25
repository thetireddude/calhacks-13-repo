import type { ActivityCandidate, CandidateDiscoveryPort, DiscoveryQuery } from "./domain.js";
import { BrightDataDatasetClient } from "./bright-data.js";
import { parseActivityCandidate } from "./validation.js";

export interface BrightDataDiscoveryConfig {
  readonly yelpDatasetId?: string;
  readonly facebookEventsVenueDatasetId?: string;
  /** Public venue names explicitly selected by the caller. */
  readonly facebookVenueNames?: readonly string[];
}

type RawRecord = Record<string, unknown>;

function asRecord(value: unknown): RawRecord | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as RawRecord : undefined;
}

function firstString(record: RawRecord, keys: readonly string[]): string | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function firstBoolean(record: RawRecord, keys: readonly string[]): boolean | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "boolean") return value;
  }
  return null;
}

function stableId(source: string, url: string, title: string): string {
  const text = `${source}:${url}:${title}`;
  let hash = 2166136261;
  for (const character of text) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  return `${source}-${(hash >>> 0).toString(36)}`;
}

function addressCity(value: unknown, fallbackCity: string): string {
  const address = typeof value === "string" ? value.trim() : "";
  if (!address) return fallbackCity;
  const parts = address.split(",").map((part) => part.trim()).filter(Boolean);
  const candidate = parts.length >= 2 ? parts[parts.length - 2] : parts[0];
  return candidate?.replace(/^\d{4,6}\s+/, "") || fallbackCity;
}

function normalizeRecord(record: RawRecord, source: "yelp" | "facebook_events", fallbackCity: string): ActivityCandidate | null {
  const title = firstString(record, ["name", "title", "event_name"]);
  const sourceUrl = firstString(record, ["url", "link", "event_url", "business_url"]);
  if (!title || !sourceUrl) return null;

  const city = firstString(record, ["city", "location", "location_city"]) ?? fallbackCity;
  const isFree = firstBoolean(record, ["is_free", "free"]);
  const priceText = firstString(record, ["price", "price_text", "ticket_price"]);
  const candidate = {
    id: stableId(source, sourceUrl, title),
    title,
    category: firstString(record, ["category", "categories", "event_type"]) ?? "activity",
    startsAt: firstString(record, ["start_date", "start_time", "date", "datetime"]),
    endsAt: firstString(record, ["end_date", "end_time"]),
    venueName: firstString(record, ["venue_name", "venue", "business_name"]),
    city,
    priceText,
    isFree: isFree ?? (priceText?.toLocaleLowerCase("en-US") === "free" ? true : null),
    sourceUrl,
    source,
  };

  try {
    return parseActivityCandidate(candidate);
  } catch {
    return null;
  }
}

/** Normalizes only public Yelp records returned by Bright Data. */
export function normalizeYelpRecords(records: readonly unknown[], city: string): readonly ActivityCandidate[] {
  return records.flatMap((record) => {
    const raw = asRecord(record);
    const normalized = raw ? normalizeRecord(raw, "yelp", city) : null;
    return normalized ? [normalized] : [];
  });
}

/** Normalizes only public Facebook venue-event records returned by Bright Data. */
export function normalizeFacebookEventRecords(records: readonly unknown[], city: string): readonly ActivityCandidate[] {
  return records.flatMap((record) => {
    const raw = asRecord(record);
    const normalized = raw ? normalizeFacebookEventRecord(raw, city) : null;
    return normalized ? [normalized] : [];
  });
}

/** Handles the published Facebook Events schema returned by Bright Data MCP. */
function normalizeFacebookEventRecord(record: RawRecord, fallbackCity: string): ActivityCandidate | null {
  const title = firstString(record, ["title", "event_name", "name"]);
  const sourceUrl = firstString(record, ["url", "redirected_event_url", "event_url"]);
  if (!title || !sourceUrl) return null;
  const eventId = firstString(record, ["event_id"]);
  const candidate = {
    id: eventId ? `facebook_events-${eventId}` : stableId("facebook_events", sourceUrl, title),
    title,
    category: firstString(record, ["category", "event_type"]) ?? "event",
    startsAt: firstString(record, ["event_start_time", "event_date", "start_date", "start_time", "date", "datetime"]),
    endsAt: firstString(record, ["event_end_time", "event_end_date", "end_date", "end_time"]),
    venueName: firstString(record, ["venue_name", "venue", "event_by"]),
    city: addressCity(record.full_address ?? record.location, fallbackCity),
    priceText: firstString(record, ["price", "price_text", "ticket_price"]),
    isFree: firstBoolean(record, ["is_free", "free"]),
    sourceUrl,
    source: "facebook_events" as const,
  };
  try {
    return parseActivityCandidate(candidate);
  } catch {
    return null;
  }
}

/**
 * Live source adapter. It uses a single selected source per request so
 * source-specific inputs and output schemas never get mixed together.
 */
export class BrightDataCandidateDiscovery implements CandidateDiscoveryPort {
  public constructor(
    private readonly client: BrightDataDatasetClient,
    private readonly config: BrightDataDiscoveryConfig,
  ) {}

  public async discover(query: DiscoveryQuery = {}): Promise<readonly ActivityCandidate[]> {
    const city = query.city?.trim() || "San Francisco, CA";
    const limit = Math.max(1, Math.min(query.limit ?? 3, 3));

    if (this.config.yelpDatasetId) {
      const searchUrl = new URL("https://www.yelp.com/search");
      searchUrl.searchParams.set("find_desc", "Restaurants");
      searchUrl.searchParams.set("find_loc", city);
      const records = await this.client.scrape({
        datasetId: this.config.yelpDatasetId,
        input: [{ url: searchUrl.toString() }],
      });
      return normalizeYelpRecords(records, city).slice(0, limit);
    }

    if (this.config.facebookEventsVenueDatasetId && this.config.facebookVenueNames?.length) {
      const records = await this.client.scrape({
        datasetId: this.config.facebookEventsVenueDatasetId,
        query: { type: "discover_new", discover_by: "venue" },
        input: this.config.facebookVenueNames.slice(0, limit).map((venue) => ({ venue })),
        limitPerInput: limit,
      });
      return normalizeFacebookEventRecords(records, city).slice(0, limit);
    }

    throw new Error("No approved Bright Data discovery source is configured");
  }
}
