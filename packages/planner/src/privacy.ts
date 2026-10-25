export interface AuthorizedPersonalContext {
  readonly preferenceTags: readonly string[];
  readonly isAvailable: boolean;
  readonly budgetCeiling: number | null;
  readonly travelRadiusKm: number | null;
  readonly learningOptIn: boolean;
  /** Backend-maintained current debt; raw history must never enter this boundary. */
  readonly optedInInclusionDebt?: number;
}

export interface ProviderSafePersonalInput {
  readonly preferenceTags: readonly string[];
  readonly isAvailable: boolean;
  readonly budgetCeiling: number | null;
  readonly travelRadiusKm: number | null;
  /** Present only for opted-in members and bounded by ADR-002's 0–3 range. */
  readonly inclusionDebt: number | null;
}

/** Removes identity, raw calendar, raw history, and opted-out learning data. */
export function prepareProviderSafeInput(
  context: AuthorizedPersonalContext,
): ProviderSafePersonalInput {
  return {
    preferenceTags: [...context.preferenceTags],
    isAvailable: context.isAvailable,
    budgetCeiling: context.budgetCeiling,
    travelRadiusKm: context.travelRadiusKm,
    inclusionDebt: context.learningOptIn ? boundedDebt(context.optedInInclusionDebt) : null,
  };
}

function boundedDebt(value: number | undefined): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(3, value as number));
}

/**
 * Explanations are public, so accept only aggregate vocabulary until DEV3-003
 * composes a structured public explanation. This rejects names and person-level
 * availability/preference claims instead of trying to redact arbitrary prose.
 */
export function isPublicExplanationSafe(explanation: string): boolean {
  const allowedWords = new Set([
    "a", "activity", "aggregate", "and", "attendance", "available", "balanced", "based", "budget",
    "candidate", "fit", "for", "from", "group", "inclusion", "is", "matches", "on", "option",
    "preferences", "public", "recommended", "strong", "supplied", "tag", "tags", "the", "this",
    "travel", "well", "with",
  ]);
  const words = explanation.toLocaleLowerCase("en-US").match(/[a-z]+/g);
  return words !== null && words.length > 0 && words.every((word) => allowedWords.has(word));
}
