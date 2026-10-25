import type { MeResponse } from "@gather/contracts";

// Thrown for non-2xx responses. Carries only the status; never the token or response body.
export class ApiError extends Error {
  constructor(readonly status: number) {
    super(`api_error_${status}`);
    this.name = "ApiError";
  }
  // status 0: the request never completed (network failure) or the 2xx body was not valid JSON.
  get network(): boolean {
    return this.status === 0;
  }
  get unauthorized(): boolean {
    return this.status === 401;
  }
}

export type ApiClientOptions = {
  baseUrl: string;
  getAccessToken: () => Promise<string | null>;
  fetchImpl?: typeof fetch;
};

export function createApiClient({ baseUrl, getAccessToken, fetchImpl = fetch }: ApiClientOptions) {
  async function request<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
    const token = await getAccessToken();
    const headers: Record<string, string> = { Accept: "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    if (init.body !== undefined) headers["Content-Type"] = "application/json";
    let res: Response;
    try {
      res = await fetchImpl(`${baseUrl.replace(/\/+$/, "")}${path}`, {
        method: init.method ?? "GET",
        headers,
        body: init.body === undefined ? undefined : JSON.stringify(init.body),
      });
    } catch {
      throw new ApiError(0);
    }
    if (!res.ok) throw new ApiError(res.status);
    try {
      return (await res.json()) as T;
    } catch {
      throw new ApiError(0);
    }
  }
  return {
    request,
    getMe: () => request<MeResponse>("/v1/me"),
  };
}
