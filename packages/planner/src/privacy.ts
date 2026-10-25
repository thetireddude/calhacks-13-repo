export interface AuthorizedPersonalContext {
  readonly preferenceTags: readonly string[];
  readonly isAvailable: boolean;
  readonly budgetCeiling: number | null;
  readonly travelRadiusKm: number | null;
  readonly learningOptIn: boolean;
  readonly optedInInclusionHistory?: readonly string[];
}

export interface ProviderSafePersonalInput {
  readonly preferenceTags: readonly string[];
  readonly isAvailable: boolean;
  readonly budgetCeiling: number | null;
  readonly travelRadiusKm: number | null;
  readonly inclusionHistory: readonly string[];
}

/** Removes identity, raw calendar, and opted-out historical-learning data. */
export function prepareProviderSafeInput(
  context: AuthorizedPersonalContext,
): ProviderSafePersonalInput {
  return {
    preferenceTags: [...context.preferenceTags],
    isAvailable: context.isAvailable,
    budgetCeiling: context.budgetCeiling,
    travelRadiusKm: context.travelRadiusKm,
    inclusionHistory: context.learningOptIn ? [...(context.optedInInclusionHistory ?? [])] : [],
  };
}

/** Public explanations may not disclose person-level histories or availability. */
export function isPublicExplanationSafe(explanation: string): boolean {
  const prohibited = ["calendar", "availability", "history", "preference profile", "declined"];
  const normalized = explanation.toLocaleLowerCase("en-US");
  return !prohibited.some((term) => normalized.includes(term));
}
