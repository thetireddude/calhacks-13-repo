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

// In-memory mock: accepts any non-empty code. Nothing is persisted or logged.
export function createMockAuthClient(): AuthClient {
  let session: Session | null = null;
  return {
    getSession: async () => session,
    requestOtp: async () => {},
    verifyOtp: async (_email, code) => {
      if (code.trim() === "") throw new Error("Enter the code.");
      session = { kind: "mock" };
      return session;
    },
    signOut: async () => {
      session = null;
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
