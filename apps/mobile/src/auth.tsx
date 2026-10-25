import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

// Mobile-local session type. The Supabase variant carries the access token sent as the API bearer
// credential; the mock variant has none.
export type Session = { readonly kind: "mock" } | { readonly kind: "supabase"; readonly accessToken: string };

// Boundary implemented by the mock and Supabase clients.
export interface AuthClient {
  getSession(): Promise<Session | null>;
  signIn(email: string, password: string): Promise<Session>;
  signUp(email: string, password: string): Promise<Session>;
  signOut(): Promise<void>;
}

// Mobile-local error shape. The contract error schema is not frozen in packages/contracts yet
// (SPEC section 11), so this stands in for it; swap when the contract lands.
// confirmation_required: signUp succeeded but Supabase "Confirm email" is still ON (no session).
export type AuthErrorCode =
  | "invalid_credentials"
  | "email_taken"
  | "weak_password"
  | "confirmation_required"
  | "network";
export class AuthError extends Error {
  constructor(readonly code: AuthErrorCode) {
    super(code);
    this.name = "AuthError";
  }
}

// Fixture outcomes for the mock; it only simulates the outcomes the UI must handle.
export type MockOutcome = "success" | AuthErrorCode;
export type MockAuthClient = AuthClient & {
  setSignInOutcome(outcome: MockOutcome): void;
  setSignUpOutcome(outcome: MockOutcome): void;
};

// In-memory mock. Nothing is persisted or logged (never log email or password values).
export function createMockAuthClient(initial: { signIn?: MockOutcome; signUp?: MockOutcome } = {}): MockAuthClient {
  let session: Session | null = null;
  let signInOutcome: MockOutcome = initial.signIn ?? "success";
  let signUpOutcome: MockOutcome = initial.signUp ?? "success";
  return {
    getSession: async () => session,
    signIn: async () => {
      if (signInOutcome !== "success") throw new AuthError(signInOutcome);
      session = { kind: "mock" };
      return session;
    },
    signUp: async () => {
      if (signUpOutcome !== "success") throw new AuthError(signUpOutcome);
      session = { kind: "mock" };
      return session;
    },
    signOut: async () => {
      session = null;
    },
    setSignInOutcome: (o) => {
      signInOutcome = o;
    },
    setSignUpOutcome: (o) => {
      signUpOutcome = o;
    },
  };
}

type AuthState = {
  loading: boolean;
  session: Session | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
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

  const signIn = useCallback(
    async (email: string, password: string) => setSession(await client.signIn(email, password)),
    [client],
  );
  const signUp = useCallback(
    async (email: string, password: string) => setSession(await client.signUp(email, password)),
    [client],
  );
  const signOut = useCallback(async () => {
    await client.signOut();
    setSession(null);
  }, [client]);

  const value = useMemo(
    () => ({ loading, session, signIn, signUp, signOut }),
    [loading, session, signIn, signUp, signOut],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
