export type BackendEnv = { supabaseUrl?: string; supabaseAnonKey?: string; apiUrl?: string };

// "mock" only when nothing is configured and mocks are allowed (dev/test). Real auth without an API URL,
// or any missing config in a release build, is a visible config error rather than a silent mock pairing.
export function selectBackend(env: BackendEnv, allowMock: boolean): "mock" | "real" | "config_error" {
  const hasAuth = Boolean(env.supabaseUrl && env.supabaseAnonKey);
  if (hasAuth && env.apiUrl) return "real";
  if (hasAuth) return "config_error";
  return allowMock ? "mock" : "config_error";
}
