import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

import { AuthError } from "./auth";
import type { AuthClient, Session } from "./auth";
import { createSecureSessionStorage } from "./secureSessionStorage";

type SupabaseError = { status?: number; code?: string } | null;

// Map SDK errors to the mobile-local codes. Never include SDK messages (they may echo input).
// Requests that fail for any non-network reason (e.g. rate limits) also surface as "network" until
// the contract error schema adds more codes (SPEC section 11).
function mapVerifyError(error: NonNullable<SupabaseError>): AuthError {
  if (error.code === "otp_expired") return new AuthError("expired_code");
  if (typeof error.status === "number" && error.status >= 400 && error.status < 500) return new AuthError("invalid_code");
  return new AuthError("network");
}

function toSession(s: { access_token: string } | null | undefined): Session | null {
  return s ? { kind: "supabase", accessToken: s.access_token } : null;
}

export function createSupabaseAuthClient(supabase: SupabaseClient): AuthClient {
  return {
    async getSession() {
      try {
        const { data } = await supabase.auth.getSession();
        return toSession(data.session);
      } catch {
        return null;
      }
    },
    async requestOtp(email) {
      let error: SupabaseError;
      try {
        ({ error } = await supabase.auth.signInWithOtp({ email }));
      } catch {
        throw new AuthError("network");
      }
      if (error) throw new AuthError("network");
    },
    async verifyOtp(email, code) {
      let result;
      try {
        result = await supabase.auth.verifyOtp({ email, token: code.trim(), type: "email" });
      } catch {
        throw new AuthError("network");
      }
      if (result.error) throw mapVerifyError(result.error);
      const session = toSession(result.data.session);
      if (!session) throw new AuthError("invalid_code");
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
export function createDefaultSupabaseAuthClient(url: string, anonKey: string): AuthClient {
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
