import { vi } from "vitest";
import { CredentialsSignin } from "next-auth";

// Stand-in for "@/lib/auth" (wired up in tests/integration/setup.ts).
// Credentials checking itself lives in src/lib/credentials.ts and is tested
// against the real database.

type Session = { user: { id: string; email?: string | null; name?: string | null } } | null;

let session: Session = null;

export class RateLimitedSignin extends CredentialsSignin {
  code = "rate_limited";
}

export const signIn = vi.fn();
export const signOut = vi.fn();

export const authModuleMock = {
  auth: vi.fn(async () => session),
  signIn,
  signOut,
  handlers: { GET: vi.fn(), POST: vi.fn() },
  RateLimitedSignin,
};

export function asUser(id: string, extra: { email?: string; name?: string } = {}) {
  session = { user: { id, ...extra } };
}

export function asAnonymous() {
  session = null;
}

export function resetAuth() {
  session = null;
  signIn.mockReset();
  signOut.mockReset();
}
