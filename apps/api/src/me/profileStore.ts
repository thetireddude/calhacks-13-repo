import type { MeResponse } from "@gather/contracts";

export type ProfileStore = {
  getOrCreateProfile(userId: string): Promise<MeResponse>;
};

export class InMemoryProfileStore implements ProfileStore {
  async getOrCreateProfile(userId: string): Promise<MeResponse> {
    return {
      id: userId,
      profile: { displayName: null },
    };
  }
}
