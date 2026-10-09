import { createHash, randomBytes } from "node:crypto";
import type { EmailTokenPurpose } from "@/generated/prisma/client";
import { db } from "./db";

const hash = (token: string) => createHash("sha256").update(token).digest("hex");

export type ConsumeResult = { ok: true; userId: string } | { ok: false; reason: "invalid" | "expired" | "used" };

/**
 * Creates a single-use token for an email link and returns it. Only its
 * SHA-256 hash is stored. Older unused tokens of the same purpose are
 * revoked, so only the newest link works.
 */
export async function createEmailToken(userId: string, purpose: EmailTokenPurpose, ttlMs: number): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  const now = new Date();
  await db.$transaction([
    db.emailToken.updateMany({ where: { userId, purpose, usedAt: null }, data: { usedAt: now } }),
    db.emailToken.create({
      data: { userId, purpose, tokenHash: hash(token), createdAt: now, expiresAt: new Date(now.getTime() + ttlMs) },
    }),
  ]);
  return token;
}

/** Checks a token without using it up (e.g. to decide whether to show a form). */
export async function peekEmailToken(token: string, purpose: EmailTokenPurpose): Promise<ConsumeResult> {
  const row = await db.emailToken.findUnique({ where: { tokenHash: hash(token) } });
  if (!row || row.purpose !== purpose) return { ok: false, reason: "invalid" };
  if (row.usedAt) return { ok: false, reason: "used" };
  if (row.expiresAt <= new Date()) return { ok: false, reason: "expired" };
  return { ok: true, userId: row.userId };
}

/** Uses up a token. Atomic: two concurrent uses cannot both succeed. */
export async function consumeEmailToken(token: string, purpose: EmailTokenPurpose): Promise<ConsumeResult> {
  const checked = await peekEmailToken(token, purpose);
  if (!checked.ok) return checked;
  const { count } = await db.emailToken.updateMany({
    where: { tokenHash: hash(token), usedAt: null },
    data: { usedAt: new Date() },
  });
  return count === 1 ? checked : { ok: false, reason: "used" };
}
