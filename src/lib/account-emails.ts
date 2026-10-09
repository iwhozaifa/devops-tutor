import { createEmailToken } from "./tokens";
import { env } from "./env";
import { passwordResetEmail, sendMail, verificationEmail } from "./mail";

export const VERIFY_TTL_MS = 24 * 60 * 60 * 1000;
export const RESET_TTL_MS = 60 * 60 * 1000;

const appUrl = (path: string) => new URL(path, env().AUTH_URL ?? "http://localhost:3000").toString();

export async function sendVerificationEmail(user: { id: string; email: string; name: string | null }) {
  const token = await createEmailToken(user.id, "VERIFY_EMAIL", VERIFY_TTL_MS);
  const url = appUrl(`/verify-email?token=${token}`);
  await sendMail({ to: user.email, ...verificationEmail({ name: user.name, url }) });
}

export async function sendPasswordResetEmail(user: { id: string; email: string; name: string | null }) {
  const token = await createEmailToken(user.id, "RESET_PASSWORD", RESET_TTL_MS);
  const url = appUrl(`/reset-password?token=${token}`);
  await sendMail({ to: user.email, ...passwordResetEmail({ name: user.name, url }) });
}
