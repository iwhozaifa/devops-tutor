import { CredentialsSignin } from "next-auth";
import bcrypt from "bcryptjs";
import { db } from "./db";
import { env } from "./env";
import { clientIpFrom, rateLimit } from "./rate-limit";

export class RateLimitedSignin extends CredentialsSignin {
  code = "rate_limited";
}

const WINDOW_MS = 15 * 60 * 1000;

/**
 * Email + password check behind the NextAuth Credentials provider. Rate
 * limited here (not only in the login server action) because NextAuth's
 * /api/auth/callback/credentials endpoint calls it directly.
 */
export async function authorizeCredentials(
  credentials: Partial<Record<"email" | "password", unknown>> | undefined,
  headers: Headers
) {
  if (!credentials?.email || !credentials?.password) return null;

  const email = String(credentials.email).trim().toLowerCase();
  const ip = clientIpFrom(headers, env().TRUSTED_PROXY_HOPS);
  if (
    !rateLimit(`login:ip:${ip}`, 20, WINDOW_MS) ||
    !rateLimit(`login:email:${email}`, 10, WINDOW_MS)
  ) {
    throw new RateLimitedSignin();
  }

  const user = await db.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
  });
  if (!user?.passwordHash) return null;

  const isValid = await bcrypt.compare(String(credentials.password), user.passwordHash);
  if (!isValid) return null;

  return { id: user.id, name: user.name, email: user.email, image: user.image };
}
