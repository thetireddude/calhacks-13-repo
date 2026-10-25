import type { FastifyInstance } from "fastify";
import type {
  PutMemberAvailabilityRequest,
  PutMemberPreferencesRequest,
} from "@gather/contracts";
import { requireAuth } from "../auth.js";
import type { MemberSetupStore } from "./store.js";

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((item) => typeof item === "string")
  );
}

function isNullableNumber(value: unknown): value is number | null {
  return value === null || (typeof value === "number" && Number.isFinite(value));
}

function parsePreferencesBody(
  body: unknown,
): PutMemberPreferencesRequest | undefined {
  if (!body || typeof body !== "object") {
    return undefined;
  }
  const b = body as Record<string, unknown>;
  if (
    !isStringArray(b.activityTags) ||
    !isNullableNumber(b.budgetMin) ||
    !isNullableNumber(b.budgetMax) ||
    !isNullableNumber(b.travelRadiusKm) ||
    typeof b.learningOptIn !== "boolean"
  ) {
    return undefined;
  }
  return {
    activityTags: b.activityTags,
    budgetMin: b.budgetMin,
    budgetMax: b.budgetMax,
    travelRadiusKm: b.travelRadiusKm,
    learningOptIn: b.learningOptIn,
  };
}

function parseAvailabilityBody(
  body: unknown,
): PutMemberAvailabilityRequest | undefined {
  if (!body || typeof body !== "object") {
    return undefined;
  }
  const windows = (body as { windows?: unknown }).windows;
  if (!Array.isArray(windows)) {
    return undefined;
  }
  const parsed: PutMemberAvailabilityRequest["windows"] = [];
  for (const item of windows) {
    if (!item || typeof item !== "object") {
      return undefined;
    }
    const w = item as Record<string, unknown>;
    if (typeof w.startsAt !== "string" || typeof w.endsAt !== "string") {
      return undefined;
    }
    if (Number.isNaN(Date.parse(w.startsAt)) || Number.isNaN(Date.parse(w.endsAt))) {
      return undefined;
    }
    if (Date.parse(w.endsAt) <= Date.parse(w.startsAt)) {
      return undefined;
    }
    if (
      w.label !== undefined &&
      w.label !== null &&
      typeof w.label !== "string"
    ) {
      return undefined;
    }
    parsed.push({
      startsAt: w.startsAt,
      endsAt: w.endsAt,
      ...(w.label !== undefined ? { label: w.label as string | null } : {}),
    });
  }
  return { windows: parsed };
}

export function registerMemberSetupRoutes(
  app: FastifyInstance,
  store: MemberSetupStore,
): void {
  app.get(
    "/v1/me/preferences",
    { preHandler: requireAuth },
    async (request) => await store.getPreferences(request.authUser!.sub),
  );

  app.put<{ Body: PutMemberPreferencesRequest }>(
    "/v1/me/preferences",
    { preHandler: requireAuth },
    async (request, reply) => {
      const parsed = parsePreferencesBody(request.body);
      if (!parsed) {
        return reply.code(400).send({ error: "invalid_body" });
      }
      return await store.putPreferences(request.authUser!.sub, parsed);
    },
  );

  app.get(
    "/v1/me/availability",
    { preHandler: requireAuth },
    async (request) => await store.getAvailability(request.authUser!.sub),
  );

  app.put<{ Body: PutMemberAvailabilityRequest }>(
    "/v1/me/availability",
    { preHandler: requireAuth },
    async (request, reply) => {
      const parsed = parseAvailabilityBody(request.body);
      if (!parsed) {
        return reply.code(400).send({ error: "invalid_body" });
      }
      return await store.putAvailability(request.authUser!.sub, parsed);
    },
  );
}
