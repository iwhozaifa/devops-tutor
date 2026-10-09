import { db } from "./db";

/** How often a session re-reads User.tokenVersion from the database. */
export const TOKEN_RECHECK_MS = 5 * 60 * 1000;

export interface SessionToken {
  id?: string;
  ver?: number;
  verCheckedAt?: number;
  [key: string]: unknown;
}

/**
 * JWT sessions cannot be revoked server-side, so each token carries the
 * user's tokenVersion from sign-in. A password reset bumps the version;
 * at most TOKEN_RECHECK_MS later every older session ends. Returns null to
 * end the session (also when the user no longer exists).
 */
export async function refreshSessionToken<T extends SessionToken>(token: T, now = Date.now()): Promise<T | null> {
  if (!token.id) return token;
  if (token.verCheckedAt !== undefined && now - token.verCheckedAt < TOKEN_RECHECK_MS) return token;

  const user = await db.user.findUnique({ where: { id: token.id }, select: { tokenVersion: true } });
  if (!user || user.tokenVersion !== (token.ver ?? 0)) return null;
  return { ...token, verCheckedAt: now };
}
