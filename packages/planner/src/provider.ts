import type { PersonalEvaluation, PersonalEvaluationProvider } from "./domain.js";

/**
 * Provider-neutral boundary. Creao-specific request and response handling
 * belongs behind an implementation of this interface after the API contract
 * and execution budget are approved.
 */
export interface ProviderAdapterConfig {
  readonly apiKey: string;
  readonly baseUrl?: string;
  readonly model?: string;
}

export class ProviderUnavailableError extends Error {
  public constructor(message = "Personal evaluation provider is unavailable") {
    super(message);
    this.name = "ProviderUnavailableError";
  }
}

/** Safe default for local development and provider-failure paths. */
export class UnavailablePersonalEvaluationProvider implements PersonalEvaluationProvider {
  public async evaluate(_input: unknown): Promise<PersonalEvaluation> {
    throw new ProviderUnavailableError();
  }
}
