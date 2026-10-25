import type { ActivityCandidate, PersonalEvaluation } from "./domain.js";
import { isPublicExplanationSafe } from "./privacy.js";

export class PlannerValidationError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "PlannerValidationError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asOptionalString(value: unknown, field: string): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") throw new PlannerValidationError(`${field} must be a string or null`);
  return value;
}

function asRequiredString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new PlannerValidationError(`${field} must be a non-empty string`);
  }
  return value;
}

function isPublicHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

/** Validates only the normalized, public candidate representation. */
export function parseActivityCandidate(value: unknown): ActivityCandidate {
  if (!isRecord(value)) throw new PlannerValidationError("candidate must be an object");

  const sourceUrl = asRequiredString(value.sourceUrl, "sourceUrl");
  if (!isPublicHttpUrl(sourceUrl)) throw new PlannerValidationError("sourceUrl must be an HTTP(S) URL");

  const source = asRequiredString(value.source, "source");
  const supportedSources = new Set(["seeded", "google_maps", "yelp", "facebook_events", "funcheap", "dothebay"]);
  if (!supportedSources.has(source)) throw new PlannerValidationError("source is unsupported");

  const startsAt = asOptionalString(value.startsAt, "startsAt");
  const endsAt = asOptionalString(value.endsAt, "endsAt");
  if (startsAt && Number.isNaN(Date.parse(startsAt))) throw new PlannerValidationError("startsAt must be ISO-compatible");
  if (endsAt && Number.isNaN(Date.parse(endsAt))) throw new PlannerValidationError("endsAt must be ISO-compatible");

  return {
    id: asRequiredString(value.id, "id"),
    title: asRequiredString(value.title, "title"),
    category: asRequiredString(value.category, "category"),
    startsAt,
    endsAt,
    venueName: asOptionalString(value.venueName, "venueName"),
    city: asRequiredString(value.city, "city"),
    priceText: asOptionalString(value.priceText, "priceText"),
    isFree: value.isFree === null || value.isFree === undefined ? null : Boolean(value.isFree),
    sourceUrl,
    source: source as ActivityCandidate["source"],
  };
}

/** Rejects malformed or privacy-unsafe personal-agent output. */
export function parsePersonalEvaluation(value: unknown): PersonalEvaluation {
  if (!isRecord(value) || typeof value.feasible !== "boolean" || !Array.isArray(value.preferenceTags)) {
    throw new PlannerValidationError("personal evaluation has an invalid shape");
  }

  if (!value.preferenceTags.every((tag) => typeof tag === "string" && tag.trim().length > 0)) {
    throw new PlannerValidationError("preferenceTags must contain non-empty strings only");
  }

  const explanation = asRequiredString(value.explanation, "explanation");
  if (!isPublicExplanationSafe(explanation)) {
    throw new PlannerValidationError("personal evaluation explanation is not privacy-safe");
  }

  return { feasible: value.feasible, preferenceTags: [...value.preferenceTags], explanation };
}
