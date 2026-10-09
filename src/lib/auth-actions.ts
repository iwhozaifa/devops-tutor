"use server";

import { AuthError, CredentialsSignin } from "next-auth";
import { signIn, signOut } from "./auth";
import { db } from "./db";
import bcrypt from "bcryptjs";
import { clientIp, rateLimit } from "./rate-limit";
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

  if (!rateLimit(`register:${await clientIp()}`, 5, 60 * 60 * 1000)) {
    return TOO_MANY;
  }

  const existing = await db.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
  });
  if (existing) {
    return { error: "Email already in use" };
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await db.user.create({
    data: { name, email, passwordHash },
  });

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
