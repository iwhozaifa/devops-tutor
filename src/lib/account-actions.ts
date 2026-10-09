"use server";

import bcrypt from "bcryptjs";
import { auth, signOut } from "./auth";
import { db } from "./db";
import { logger } from "./logger";
import { rateLimit } from "./rate-limit";

const DELETED = "deleted user";

/**
 * Permanently deletes the signed-in account. Confirmed with the current
 * password, or by typing the email for accounts without one (GitHub
 * sign-in). All learner data cascades with the user row; audit log entries
 * stay, with the email replaced by "deleted user".
 */
export async function deleteAccount(formData: FormData): Promise<{ error: string } | void> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not signed in" };

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, passwordHash: true },
  });
  if (!user) return { error: "Not signed in" };

  if (!(await rateLimit(`delete-account:${user.id}`, 5, 15 * 60 * 1000))) {
    return { error: "Too many attempts. Please try again later." };
  }

  const confirm = String(formData.get("confirm") ?? "");
  if (user.passwordHash) {
    if (!(await bcrypt.compare(confirm, user.passwordHash))) return { error: "That password is not correct" };
  } else if (confirm.trim().toLowerCase() !== user.email.toLowerCase()) {
    return { error: "Type your email address exactly to confirm" };
  }

  await db.$transaction([
    db.adminAuditLog.updateMany({ where: { actorId: user.id }, data: { actorLabel: DELETED } }),
    db.adminAuditLog.updateMany({ where: { targetUserId: user.id }, data: { targetLabel: DELETED } }),
    db.user.delete({ where: { id: user.id } }),
  ]);
  logger.info("account deleted", { userId: user.id });

  await signOut({ redirectTo: "/?deleted=1" });
}
