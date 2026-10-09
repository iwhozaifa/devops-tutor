"use server";

import { AuthError, CredentialsSignin } from "next-auth";
import { auth, signIn, signOut } from "./auth";
import { sendVerificationEmail } from "./account-emails";
import { logger } from "./logger";
import { db } from "./db";
import bcrypt from "bcryptjs";
import { clientIp } from "./client-ip";
import { rateLimit } from "./rate-limit";
import { loginSchema, registerSchema } from "./validation";

const TOO_MANY = { error: "Too many attempts. Please try again later." };

export async function registerUser(formData: FormData) {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { name, email, password } = parsed.data;

  if (!(await rateLimit(`register:${await clientIp()}`, 5, 60 * 60 * 1000))) {
    return TOO_MANY;
  }

  const existing = await db.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
  });
  if (existing) {
    return { error: "Email already in use" };
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await db.user.create({
    data: { name, email, passwordHash },
  });

  // A failed send must not block registration; the banner offers a resend
  try {
    await sendVerificationEmail(user);
  } catch (err) {
    logger.error("verification email failed", { userId: user.id, err });
  }

  await signIn("credentials", { email, password, redirectTo: "/dashboard" });
}

export async function loginUser(formData: FormData) {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: "Email and password are required" };
  }
  const { email, password } = parsed.data;

  try {
    await signIn("credentials", { email, password, redirectTo: "/dashboard" });
  } catch (error) {
    if (error instanceof CredentialsSignin && error.code === "rate_limited") {
      return TOO_MANY;
    }
    if (error instanceof AuthError) {
      return { error: "Invalid email or password" };
    }
    throw error; // includes the redirect thrown on success
  }
}

export async function logoutUser() {
  await signOut({ redirectTo: "/" });
}

export async function resendVerificationEmail(): Promise<
  { ok: true; alreadyVerified?: true } | { error: string }
> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not signed in" };

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, name: true, emailVerified: true },
  });
  if (!user) return { error: "Not signed in" };
  if (user.emailVerified) return { ok: true, alreadyVerified: true };

  if (!(await rateLimit(`verify-resend:${user.id}`, 3, 60 * 60 * 1000))) return TOO_MANY;

  await sendVerificationEmail(user);
  return { ok: true };
}
