/** In-memory mock session until real Supabase OTP + API wiring (DEV1-004+). */

const MOCK_OTP = '123456';
const REQUEST_DELAY_MS = 400;

export type MockAuthSession = {
  accessToken: string;
  userId: string;
  email: string;
};

let session: MockAuthSession | null = null;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isValidEmail(email: string): boolean {
  const trimmed = email.trim();
  return trimmed.includes('@') && trimmed.length >= 5;
}

export class MockAuthError extends Error {
  readonly code: 'invalid_email' | 'invalid_code' | 'network';

  constructor(code: MockAuthError['code'], message: string) {
    super(message);
    this.code = code;
  }
}

/** Simulates POST /auth/otp (Supabase signInWithOtp). */
export async function requestEmailOtp(email: string): Promise<void> {
  await delay(REQUEST_DELAY_MS);
  if (!isValidEmail(email)) {
    throw new MockAuthError('invalid_email', 'Enter a valid email address.');
  }
}

/** Simulates verifyOtp; accepts mock code only. */
export async function verifyEmailOtp(email: string, code: string): Promise<MockAuthSession> {
  await delay(REQUEST_DELAY_MS);
  const normalized = code.trim();
  if (normalized !== MOCK_OTP) {
    throw new MockAuthError('invalid_code', 'Incorrect code. Use 123456 for the mock flow.');
  }
  session = {
    accessToken: 'mock-access-token',
    userId: 'mock-user-0001',
    email: email.trim().toLowerCase(),
  };
  return session;
}

export function getMockAuthSession(): MockAuthSession | null {
  return session;
}

export function clearMockAuthSession(): void {
  session = null;
}

export function getMockOtpHint(): string {
  return MOCK_OTP;
}
