import type { PersonalEvaluation, PersonalEvaluationProvider } from "./domain.js";
import { parsePersonalEvaluation } from "./validation.js";

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

export interface CreaoAppConfig {
  readonly appId: string;
  readonly apiKey: string;
  readonly baseUrl?: string;
  readonly pollIntervalMs?: number;
  readonly maxPollAttempts?: number;
}

/** App-scoped CREAO API Trigger adapter; poll-only, with no conversation reuse. */
export class CreaoAppEvaluationProvider implements PersonalEvaluationProvider {
  public constructor(private readonly config: CreaoAppConfig, private readonly fetchImpl: typeof fetch = fetch) {}
  public async evaluate(input: unknown): Promise<PersonalEvaluation> {
    if (!isInput(input)) throw new ProviderUnavailableError("Invalid Creao input");
    const base = (this.config.baseUrl ?? "https://agent.creao.ai").replace(/\/$/, "");
    const created = await this.fetchImpl(`${base}/api/v1/apps/${this.config.appId}/runs`, { method: "POST", headers: { Authorization: `Bearer ${this.config.apiKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ inputs: input }) });
    if (!created.ok) {
      const configurationHint = created.status === 401 || created.status === 403
        ? "; verify the capi_ key was created for this exact app and API Trigger is enabled"
        : "";
      throw new ProviderUnavailableError(`Creao run creation failed (${created.status})${configurationHint}`);
    }
    const { id } = await created.json() as { id?: string };
    if (!id) throw new ProviderUnavailableError("Creao did not return a run id");
    const pollIntervalMs = this.config.pollIntervalMs ?? 1_000;
    const maxPollAttempts = this.config.maxPollAttempts ?? 60;
    for (let attempt = 0; attempt < maxPollAttempts; attempt += 1) {
      const polled = await this.fetchImpl(`${base}/api/v1/apps/${this.config.appId}/runs/${id}`, { headers: { Authorization: `Bearer ${this.config.apiKey}` } });
      if (polled.status === 429) {
        const retryAfterSeconds = Number(polled.headers.get("retry-after"));
        const delay = Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0
          ? retryAfterSeconds * 1_000
          : Math.max(pollIntervalMs, 2_000);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      const run = await polled.json() as { status?: string; result?: { text?: string } };
      if (!polled.ok) throw new ProviderUnavailableError(`Creao run poll failed (${polled.status})`);
      if (run.status === "completed") return parsePersonalEvaluation(JSON.parse(run.result?.text ?? ""));
      if (run.status === "failed" || run.status === "cancelled") throw new ProviderUnavailableError(`Creao run ${run.status}`);
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }
    throw new ProviderUnavailableError("Creao run timed out");
  }
}

function isInput(value: unknown): value is { permitted_preferences: string; proposed_activity: string } {
  return typeof value === "object" && value !== null && typeof (value as Record<string, unknown>).permitted_preferences === "string" && typeof (value as Record<string, unknown>).proposed_activity === "string";
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
