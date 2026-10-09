import { describe, expect, it } from "vitest";
import bcrypt from "bcryptjs";
import { CredentialsSignin, AuthError } from "next-auth";
import { db } from "@/lib/db";
import { authorizeCredentials } from "@/lib/credentials";
import { loginUser, registerUser } from "@/lib/auth-actions";
import { signIn } from "../helpers/auth";
import { setClientIp } from "../helpers/request";
import { createUser, PASSWORD } from "../helpers/fixtures";

const ip = (n: number) => new Headers({ "x-forwarded-for": `198.51.100.${n}` });

function form(fields: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

describe("authorizeCredentials", () => {
  it("returns the user for a correct password, matching email case-insensitively", async () => {
    const user = await createUser({ email: "Mixed.Case@example.test" });
    const result = await authorizeCredentials({ email: "mixed.case@EXAMPLE.test", password: PASSWORD }, ip(1));
    expect(result).toMatchObject({ id: user.id, email: user.email });
  });

  it("returns null for a wrong password, an unknown email, or an OAuth-only account", async () => {
    await createUser({ email: "known@example.test" });
    await db.user.create({ data: { email: "oauth@example.test" } });
    expect(await authorizeCredentials({ email: "known@example.test", password: "nope-nope" }, ip(2))).toBeNull();
    expect(await authorizeCredentials({ email: "ghost@example.test", password: PASSWORD }, ip(2))).toBeNull();
    expect(await authorizeCredentials({ email: "oauth@example.test", password: PASSWORD }, ip(2))).toBeNull();
    expect(await authorizeCredentials({ email: "", password: "" }, ip(2))).toBeNull();
  });

  it("rate limits per email after 10 attempts, even with a correct password", async () => {
    await createUser({ email: "target@example.test" });
    for (let i = 0; i < 10; i++) {
      await authorizeCredentials({ email: "target@example.test", password: "wrong" }, ip(100 + i));
    }
    await expect(
      authorizeCredentials({ email: "target@example.test", password: PASSWORD }, ip(120))
    ).rejects.toMatchObject({ code: "rate_limited" });
  });

  it("rate limits per client IP after 20 attempts", async () => {
    for (let i = 0; i < 20; i++) {
      await authorizeCredentials({ email: `spray${i}@example.test`, password: "wrong" }, ip(3));
    }
    const err = await authorizeCredentials({ email: "spray99@example.test", password: "wrong" }, ip(3)).catch((e) => e);
    expect(err).toBeInstanceOf(CredentialsSignin);
    expect(err.code).toBe("rate_limited");
  });
});

describe("registerUser", () => {
  it("creates a user with a normalized email and a bcrypt hash, then signs in", async () => {
    setClientIp("192.0.2.1");
    await registerUser(form({ name: "Ada", email: "  Ada@Example.TEST ", password: "long-enough-pw" }));
    const user = await db.user.findUniqueOrThrow({ where: { email: "ada@example.test" } });
    expect(await bcrypt.compare("long-enough-pw", user.passwordHash!)).toBe(true);
    expect(signIn).toHaveBeenCalledWith("credentials", expect.objectContaining({ email: "ada@example.test" }));
  });

  it("rejects a duplicate email regardless of case, and invalid input", async () => {
    setClientIp("192.0.2.2");
    await createUser({ email: "taken@example.test" });
    expect(await registerUser(form({ name: "X", email: "TAKEN@example.test", password: "long-enough-pw" }))).toEqual({
      error: "Email already in use",
    });
    expect(await registerUser(form({ name: "X", email: "not-an-email", password: "long-enough-pw" }))).toHaveProperty("error");
    expect(await registerUser(form({ name: "X", email: "short@example.test", password: "short" }))).toHaveProperty("error");
  });

  it("allows 5 registrations per IP per hour", async () => {
    setClientIp("192.0.2.3");
    for (let i = 0; i < 5; i++) {
      await registerUser(form({ name: "X", email: `bulk${i}@example.test`, password: "long-enough-pw" }));
    }
    const res = await registerUser(form({ name: "X", email: "bulk5@example.test", password: "long-enough-pw" }));
    expect(res).toEqual({ error: "Too many attempts. Please try again later." });
    expect(await db.user.count({ where: { email: { startsWith: "bulk" } } })).toBe(5);
  });
});

describe("loginUser", () => {
  it("maps a rate-limited sign-in to a friendly error", async () => {
    const limited = new CredentialsSignin();
    limited.code = "rate_limited";
    signIn.mockRejectedValueOnce(limited);
    expect(await loginUser(form({ email: "a@example.test", password: "x" }))).toEqual({
      error: "Too many attempts. Please try again later.",
    });
  });

  it("maps other auth failures to invalid credentials, and rethrows anything else", async () => {
    signIn.mockRejectedValueOnce(new CredentialsSignin());
    expect(await loginUser(form({ email: "a@example.test", password: "x" }))).toEqual({
      error: "Invalid email or password",
    });
    signIn.mockRejectedValueOnce(new AuthError("boom"));
    expect(await loginUser(form({ email: "a@example.test", password: "x" }))).toHaveProperty("error");
    signIn.mockRejectedValueOnce(new Error("NEXT_REDIRECT"));
    await expect(loginUser(form({ email: "a@example.test", password: "x" }))).rejects.toThrow("NEXT_REDIRECT");
  });
});
