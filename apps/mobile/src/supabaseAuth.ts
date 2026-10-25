import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

import { AuthError } from "./auth";
import type { AuthClient, Session } from "./auth";
import { createSecureSessionStorage } from "./secureSessionStorage";

type SupabaseError = { status?: number; code?: string } | null;

// Map SDK errors to the mobile-local codes. Never include SDK messages (they may echo input).
// Rate limits (429), 5xx and unknown/missing status surface as "network" (retry-type) until the
// contract error schema adds more codes (SPEC section 11).
function mapAuthError(error: NonNullable<SupabaseError>, isSignIn = false): AuthError {
  if (error.code === "invalid_credentials") return new AuthError("invalid_credentials");
  if (error.code === "user_already_exists" || error.code === "email_exists") return new AuthError("email_taken");
  if (error.code === "weak_password") return new AuthError("weak_password");
  if (error.code === "email_not_confirmed") return new AuthError("confirmation_required");
  // Older gotrue responses carry no `code`; on sign-in a bare 400/401 means bad credentials.
  if (isSignIn && !error.code && (error.status === 400 || error.status === 401)) {
    return new AuthError("invalid_credentials");
  }
  return new AuthError("network");
}

function toSession(s: { access_token: string } | null | undefined): Session | null {
  return s ? { kind: "supabase", accessToken: s.access_token } : null;
}

export type SupabaseAuthClient = AuthClient & {
  // Current (auto-refreshed) access token. Session.accessToken is only a snapshot and expires (~1h);
  // pass this as apiClient's `getAccessToken` so each request uses a fresh token.
  getAccessToken(): Promise<string | null>;
};

export function createSupabaseAuthClient(supabase: SupabaseClient): SupabaseAuthClient {
  return {
    async getAccessToken() {
      try {
        const { data } = await supabase.auth.getSession();
        return data.session?.access_token ?? null;
      } catch {
        return null;
      }
    },
    async getSession() {
      try {
        const { data } = await supabase.auth.getSession();
        return toSession(data.session);
      } catch {
        return null;
      }
    },
    async signIn(email, password) {
      let result;
      try {
        result = await supabase.auth.signInWithPassword({ email, password });
      } catch {
        throw new AuthError("network");
      }
      if (result.error) throw mapAuthError(result.error, true);
      const session = toSession(result.data.session);
      if (!session) throw new AuthError("network");
      return session;
    },
    async signUp(email, password) {
      let result;
      try {
        result = await supabase.auth.signUp({ email, password });
      } catch {
        throw new AuthError("network");
      }
      if (result.error) throw mapAuthError(result.error);
      const session = toSession(result.data.session);
      // No session means Supabase "Confirm email" is still ON; do not pretend the user is signed in.
      if (!session) throw new AuthError("confirmation_required");
      return session;
    },
    async signOut() {
      try {
        await supabase.auth.signOut();
      } catch {
        // Fall through: local session is cleared by the SDK even if the revoke call fails.
      }
    },
  };
}

// Public anon key only; never ship the service role key or JWT secret in the app.
export function createDefaultSupabaseAuthClient(url: string, anonKey: string): SupabaseAuthClient {
  const supabase = createClient(url, anonKey, {
    auth: {
      storage: createSecureSessionStorage(),
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  });
  return createSupabaseAuthClient(supabase);
}
