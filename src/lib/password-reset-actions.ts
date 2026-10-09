"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "./db";
import { clientIp } from "./client-ip";
import { rateLimit } from "./rate-limit";
import { sendPasswordResetEmail } from "./account-emails";
import { consumeEmailToken, peekEmailToken } from "./tokens";
import { logger } from "./logger";
import { registerSchema } from "./validation";

const TOO_MANY = { error: "Too many attempts. Please try again later." };
const GENERIC = { ok: true, message: "If an account exists for that email, we sent a link to reset its password." } as const;

const TOKEN_ERRORS = {
  invalid: "This reset link is not valid. Request a new one.",
  expired: "This reset link has expired. Request a new one.",
  used: "This reset link has already been used. Request a new one.",
} as const;

/**
 * Sends a reset link to accounts that have a password. The answer is the
 * same whether or not the account exists, so the form cannot be used to
 * find out who has an account.
 */
export async function requestPasswordReset(formData: FormData) {
  const parsed = z.string().trim().toLowerCase().pipe(z.email().max(254)).safeParse(formData.get("email"));
  if (!parsed.success) return { error: "Enter a valid email address" };
  const email = parsed.data;

  if (
    !(await rateLimit(`reset:ip:${await clientIp()}`, 5, 15 * 60 * 1000)) ||
    !(await rateLimit(`reset:email:${email}`, 3, 60 * 60 * 1000))
  ) {
    return TOO_MANY;
  }

  const user = await db.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    select: { id: true, email: true, name: true, passwordHash: true },
  });
  if (user?.passwordHash) {
    try {
      await sendPasswordResetEmail(user);
    } catch (err) {
      logger.error("password reset email failed", { userId: user.id, err });
    }
  }
  return GENERIC;
}

export async function resetPassword(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const password = registerSchema.shape.password.safeParse(formData.get("password"));

  // Validate before using up the link, so a typo does not burn it
  const checked = await peekEmailToken(token, "RESET_PASSWORD");
  if (!checked.ok) return { error: TOKEN_ERRORS[checked.reason] };
  if (!password.success) return { error: password.error.issues[0]?.message ?? "Invalid password" };

  const consumed = await consumeEmailToken(token, "RESET_PASSWORD");
  if (!consumed.ok) return { error: TOKEN_ERRORS[consumed.reason] };

  const passwordHash = await bcrypt.hash(password.data, 12);
  const user = await db.user.findUniqueOrThrow({ where: { id: consumed.userId }, select: { emailVerified: true } });
  await db.user.update({
    where: { id: consumed.userId },
    data: {
      passwordHash,
      // Every session from before the reset ends (src/lib/session.ts)
      tokenVersion: { increment: 1 },
      // Receiving the link proves the address
      emailVerified: user.emailVerified ?? new Date(),
    },
  });
  logger.info("password reset", { userId: consumed.userId });

  redirect("/login?reset=1");
}
