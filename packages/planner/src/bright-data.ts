export interface BrightDataDatasetRequest {
  readonly datasetId: string;
  readonly input: readonly Record<string, unknown>[];
  readonly query?: Readonly<Record<string, string>>;
  readonly limitPerInput?: number;
}

export interface BrightDataClientConfig {
  readonly apiKey: string;
  readonly baseUrl?: string;
}

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export class BrightDataRequestError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "BrightDataRequestError";
  }
}

/**
 * Minimal authenticated dataset client. Source-specific request construction
 * and response normalization remain separate because their schemas differ.
 */
export class BrightDataDatasetClient {
  private readonly baseUrl: string;

  public constructor(
    private readonly config: BrightDataClientConfig,
    private readonly fetchImpl: FetchLike = fetch,
  ) {
    this.baseUrl = (config.baseUrl ?? "https://api.brightdata.com").replace(/\/$/, "");
  }

  public async scrape(request: BrightDataDatasetRequest): Promise<readonly unknown[]> {
    if (!request.datasetId.trim()) throw new BrightDataRequestError("datasetId is required");
    if (request.input.length === 0) return [];

    const endpoint = new URL("/datasets/v3/scrape", this.baseUrl);
    endpoint.searchParams.set("dataset_id", request.datasetId);
    endpoint.searchParams.set("notify", "false");
    endpoint.searchParams.set("include_errors", "true");
    for (const [key, value] of Object.entries(request.query ?? {})) endpoint.searchParams.set(key, value);

    const response = await this.fetchImpl(endpoint.toString(), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        input: request.input,
        ...(request.limitPerInput === undefined ? {} : { limit_per_input: request.limitPerInput }),
      }),
    });

    if (!response.ok) {
      throw new BrightDataRequestError(`Bright Data request failed with status ${response.status}`);
    }

    const payload: unknown = await response.json();
    if (!Array.isArray(payload)) {
      throw new BrightDataRequestError("Bright Data response must be an array of records");
    }
    return payload;
  }
}
