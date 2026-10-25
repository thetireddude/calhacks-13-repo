import * as SecureStore from "expo-secure-store";

// SecureStore warns above ~2KB per value; a Supabase session JSON can exceed that, so values are chunked.
const CHUNK_SIZE = 1800;

type SecureStoreLike = Pick<typeof SecureStore, "getItemAsync" | "setItemAsync" | "deleteItemAsync">;

export type SessionStorage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
};

// Keys only use [A-Za-z0-9._-], which SecureStore allows. Never log keys or values.
export function createSecureSessionStorage(store: SecureStoreLike = SecureStore): SessionStorage {
  const countKey = (key: string) => `${key}.n`;
  const chunkKey = (key: string, i: number) => `${key}.${i}`;

  async function removeItem(key: string) {
    const n = Number(await store.getItemAsync(countKey(key)));
    if (Number.isInteger(n) && n > 0) {
      for (let i = 0; i < n; i++) await store.deleteItemAsync(chunkKey(key, i));
    }
    await store.deleteItemAsync(countKey(key));
  }

  return {
    async getItem(key) {
      const n = Number(await store.getItemAsync(countKey(key)));
      if (!Number.isInteger(n) || n <= 0) return null;
      let out = "";
      for (let i = 0; i < n; i++) {
        const part = await store.getItemAsync(chunkKey(key, i));
        if (part === null) return null;
        out += part;
      }
      return out;
    },
    async setItem(key, value) {
      await removeItem(key);
      const chunks: string[] = [];
      for (let o = 0; o < value.length; o += CHUNK_SIZE) chunks.push(value.slice(o, o + CHUNK_SIZE));
      for (let i = 0; i < chunks.length; i++) await store.setItemAsync(chunkKey(key, i), chunks[i]!);
      await store.setItemAsync(countKey(key), String(chunks.length));
    },
    removeItem,
  };
}
