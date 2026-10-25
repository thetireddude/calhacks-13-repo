import type { ActivityCandidate, CandidateDiscoveryPort, DiscoveryQuery } from "./domain.js";

export interface DiscoveryFailure {
  readonly source: string;
  readonly message: string;
}

export interface DiscoveryResult {
  readonly candidates: readonly ActivityCandidate[];
  readonly usedFallback: boolean;
  readonly failures: readonly DiscoveryFailure[];
}

/** Falls back locally whenever a configured live discovery source fails. */
export class FallbackCandidateDiscovery {
  public constructor(
    private readonly primary: CandidateDiscoveryPort,
    private readonly fallback: CandidateDiscoveryPort,
    private readonly sourceName: string,
  ) {}

  public async discover(query: DiscoveryQuery = {}): Promise<DiscoveryResult> {
    try {
      return { candidates: await this.primary.discover(query), usedFallback: false, failures: [] };
    } catch (error) {
      return {
        candidates: await this.fallback.discover(query),
        usedFallback: true,
        failures: [{ source: this.sourceName, message: error instanceof Error ? error.message : "Unknown error" }],
      };
    }
  }
}
