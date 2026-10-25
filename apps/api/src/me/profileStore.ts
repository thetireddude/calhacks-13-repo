import type { MeResponse } from "@gather/contracts";

export type ProfileStore = {
  getOrCreateProfile(userId: string): Promise<MeResponse>;
  updateDisplayName(
    userId: string,
    displayName: string | null,
  ): Promise<MeResponse>;
};

export class InMemoryProfileStore implements ProfileStore {
  private readonly displayNames = new Map<string, string | null>();

  async getOrCreateProfile(userId: string): Promise<MeResponse> {
    return {
      id: userId,
      profile: { displayName: this.displayNames.get(userId) ?? null },
    };
  }

  async updateDisplayName(
    userId: string,
    displayName: string | null,
  ): Promise<MeResponse> {
    this.displayNames.set(userId, displayName);
    return this.getOrCreateProfile(userId);
  }
}
