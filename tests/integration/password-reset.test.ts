import { readdirSync, readFileSync, rmSync } from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { db } from "@/lib/db";
import { requestPasswordReset, resetPassword } from "@/lib/password-reset-actions";
import { refreshSessionToken, TOKEN_RECHECK_MS } from "@/lib/session";
import { authorizeCredentials } from "@/lib/credentials";
import ResetPasswordPage from "@/app/(auth)/reset-password/page";
import { setClientIp } from "../helpers/request";
import { createUser, PASSWORD } from "../helpers/fixtures";

const OUTBOX = path.resolve(".mail-outbox-test");
const GENERIC = { ok: true, message: "If an account exists for that email, we sent a link to reset its password." };

const outbox = () => {
  try {
    return readdirSync(OUTBOX).sort().map((f) => JSON.parse(readFileSync(path.join(OUTBOX, f), "utf8")));
  } catch {
    return [];
  }
};
const tokenFrom = (mail: { text: string }) =>
  new URL(mail.text.match(/https?:\/\/\S+/)![0]).searchParams.get("token")!;
const form = (fields: Record<string, string>) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
};
const ip = new Headers({ "x-forwarded-for": "198.51.100.200" });

beforeEach(() => {
  rmSync(OUTBOX, { recursive: true, force: true });
});

describe("requestPasswordReset", () => {
  it("answers the same for existing, unknown and OAuth-only accounts, and only mails password accounts", async () => {
    setClientIp("192.0.2.70");
    const user = await createUser({ email: "reset.me@example.test" });
    await db.user.create({ data: { email: "oauth.only@example.test" } });

    expect(await requestPasswordReset(form({ email: "Reset.Me@example.test" }))).toEqual(GENERIC);
    expect(await requestPasswordReset(form({ email: "nobody@example.test" }))).toEqual(GENERIC);
    expect(await requestPasswordReset(form({ email: "oauth.only@example.test" }))).toEqual(GENERIC);

    const mails = outbox();
    expect(mails).toHaveLength(1);
    expect(mails[0]).toMatchObject({ to: user.email, subject: "Reset your DevOps Tutor password" });
    const token = await db.emailToken.findFirstOrThrow({ where: { userId: user.id, purpose: "RESET_PASSWORD" } });
    expect(token.expiresAt.getTime() - token.createdAt.getTime()).toBe(60 * 60 * 1000);
  });

  it("is rate limited per email and per client IP", async () => {
    await createUser({ email: "target@example.test" });
    for (let i = 0; i < 3; i++) {
      setClientIp(`192.0.2.${100 + i}`);
      await requestPasswordReset(form({ email: "target@example.test" }));
    }
    setClientIp("192.0.2.110");
    expect(await requestPasswordReset(form({ email: "target@example.test" }))).toEqual({
      error: "Too many attempts. Please try again later.",
    });

    setClientIp("192.0.2.111");
    for (let i = 0; i < 5; i++) await requestPasswordReset(form({ email: `spray${i}@example.test` }));
    expect(await requestPasswordReset(form({ email: "spray9@example.test" }))).toEqual({
      error: "Too many attempts. Please try again later.",
    });
  });
});

describe("resetPassword", () => {
  async function linkFor(email: string) {
    setClientIp("192.0.2.80");
    await requestPasswordReset(form({ email }));
    return tokenFrom(outbox().at(-1));
  }

  it("sets the new password, confirms the email, and the link works once", async () => {
    const user = await createUser({ email: "change@example.test" });
    const token = await linkFor(user.email);

    await expect(resetPassword(form({ token, password: "brand-new-password" }))).rejects.toThrow(/NEXT_REDIRECT/);

    expect(await authorizeCredentials({ email: user.email, password: "brand-new-password" }, ip)).toMatchObject({ id: user.id });
    expect(await authorizeCredentials({ email: user.email, password: PASSWORD }, ip)).toBeNull();
    const after = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(after.emailVerified).toBeInstanceOf(Date);
    expect(after.tokenVersion).toBe(user.tokenVersion + 1);

    expect(await resetPassword(form({ token, password: "another-password-1" }))).toEqual({
      error: "This reset link has already been used. Request a new one.",
    });
  });

  it("rejects weak passwords without using up the link", async () => {
    const user = await createUser({ email: "weak@example.test" });
    const token = await linkFor(user.email);
    expect(await resetPassword(form({ token, password: "short" }))).toEqual({
      error: "Password must be at least 8 characters",
    });
    await expect(resetPassword(form({ token, password: "long-enough-now" }))).rejects.toThrow(/NEXT_REDIRECT/);
  });

  it("rejects unknown and expired links", async () => {
    expect(await resetPassword(form({ token: "nope", password: "long-enough-now" }))).toEqual({
      error: "This reset link is not valid. Request a new one.",
    });
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    const user = await createUser({ email: "late@example.test" });
    const token = await linkFor(user.email);
    vi.setSystemTime(new Date("2026-01-01T01:00:01Z"));
    expect(await resetPassword(form({ token, password: "long-enough-now" }))).toEqual({
      error: "This reset link has expired. Request a new one.",
    });
    vi.useRealTimers();
  });

  it("shows the form for a valid link without using it up", async () => {
    const user = await createUser({ email: "peek@example.test" });
    const token = await linkFor(user.email);
    const html = renderToStaticMarkup(await ResetPasswordPage({ searchParams: Promise.resolve({ token }) }));
    expect(html).toContain("New password");
    const stored = await db.emailToken.findFirstOrThrow({ where: { userId: user.id, purpose: "RESET_PASSWORD" } });
    expect(stored.usedAt).toBeNull();
    const bad = renderToStaticMarkup(await ResetPasswordPage({ searchParams: Promise.resolve({ token: "x" }) }));
    expect(bad).toContain("not valid");
  });
});

describe("refreshSessionToken", () => {
  it("ends sessions issued before a password reset, rechecking at most every few minutes", async () => {
    const user = await createUser();
    const issuedAt = Date.parse("2026-01-01T00:00:00Z");
    const token = { id: user.id, ver: 0, verCheckedAt: issuedAt };

    await db.user.update({ where: { id: user.id }, data: { tokenVersion: { increment: 1 } } });

    // Within the recheck window the token is trusted as-is
    expect(await refreshSessionToken(token, issuedAt + TOKEN_RECHECK_MS - 1)).toEqual(token);
    // After it, the version mismatch ends the session
    expect(await refreshSessionToken(token, issuedAt + TOKEN_RECHECK_MS + 1)).toBeNull();
  });

  it("keeps current sessions and ends sessions of deleted users", async () => {
    const user = await createUser();
    const now = Date.now();
    const fresh = await refreshSessionToken({ id: user.id, ver: 0, verCheckedAt: 0 }, now);
    expect(fresh).toEqual({ id: user.id, ver: 0, verCheckedAt: now });

    await db.user.delete({ where: { id: user.id } });
    expect(await refreshSessionToken({ id: user.id, ver: 0, verCheckedAt: 0 }, now)).toBeNull();
  });
});
