import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

// Opaque, mobile-local session type. The real shape arrives with Supabase auth (DEV1-009).
export type Session = { readonly kind: "mock" };

// Boundary the real Supabase client will implement later.
export interface AuthClient {
  getSession(): Promise<Session | null>;
  requestOtp(email: string): Promise<void>;
  verifyOtp(email: string, code: string): Promise<Session>;
  signOut(): Promise<void>;
}

// Mobile-local error shape. The contract error schema is not frozen in packages/contracts yet
// (SPEC section 11), so this stands in for it; swap when the contract lands.
export type AuthErrorCode = "invalid_code" | "expired_code" | "network";
export class AuthError extends Error {
  constructor(readonly code: AuthErrorCode) {
    super(code);
    this.name = "AuthError";
  }
}

// Fixture outcomes for the mock. Code length, expiry window and rate limits are NOT approved
// product rules; the mock only simulates the outcomes the UI must handle.
export type MockOutcome = "success" | "invalid_code" | "expired_code" | "network";
export type MockAuthClient = AuthClient & {
  setRequestOutcome(outcome: "success" | "network"): void;
  setVerifyOutcome(outcome: MockOutcome): void;
};

// In-memory mock. Nothing is persisted or logged (never log email or OTP values).
export function createMockAuthClient(
  initial: { request?: "success" | "network"; verify?: MockOutcome } = {},
): MockAuthClient {
  let session: Session | null = null;
  let requestOutcome = initial.request ?? "success";
  let verifyOutcome: MockOutcome = initial.verify ?? "success";
  return {
    getSession: async () => session,
    requestOtp: async () => {
      if (requestOutcome === "network") throw new AuthError("network");
    },
    verifyOtp: async (_email, code) => {
      if (verifyOutcome !== "success") throw new AuthError(verifyOutcome);
      if (code.trim() === "") throw new AuthError("invalid_code");
      session = { kind: "mock" };
      return session;
    },
    signOut: async () => {
      session = null;
    },
    setRequestOutcome: (o) => {
      requestOutcome = o;
    },
    setVerifyOutcome: (o) => {
      verifyOutcome = o;
    },
  };
}

type AuthState = {
  loading: boolean;
  session: Session | null;
  requestOtp: (email: string) => Promise<void>;
  verifyOtp: (email: string, code: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ client, children }: { client: AuthClient; children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    let active = true;
    client.getSession().then((s) => {
      if (active) {
        setSession(s);
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [client]);

  const requestOtp = useCallback((email: string) => client.requestOtp(email), [client]);
  const verifyOtp = useCallback(
    async (email: string, code: string) => setSession(await client.verifyOtp(email, code)),
    [client],
  );
  const signOut = useCallback(async () => {
    await client.signOut();
    setSession(null);
  }, [client]);

  const value = useMemo(
    () => ({ loading, session, requestOtp, verifyOtp, signOut }),
    [loading, session, requestOtp, verifyOtp, signOut],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
