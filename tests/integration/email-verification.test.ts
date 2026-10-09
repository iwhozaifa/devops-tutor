import { createHash } from "node:crypto";
import { readdirSync, readFileSync, rmSync } from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { db } from "@/lib/db";
import { consumeEmailToken, createEmailToken } from "@/lib/tokens";
import { registerUser, resendVerificationEmail } from "@/lib/auth-actions";
import VerifyEmailPage from "@/app/(auth)/verify-email/page";
import { asUser } from "../helpers/auth";
import { setClientIp } from "../helpers/request";
import { createUser } from "../helpers/fixtures";

const OUTBOX = path.resolve(".mail-outbox-test");
const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

function outbox() {
  try {
    return readdirSync(OUTBOX)
      .sort()
      .map((f) => JSON.parse(readFileSync(path.join(OUTBOX, f), "utf8")));
  } catch {
    return [];
  }
}

function tokenFromMail(mail: { text: string }) {
  return new URL(mail.text.match(/https?:\/\/\S+/)![0]).searchParams.get("token")!;
}

function form(fields: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

beforeEach(() => {
  rmSync(OUTBOX, { recursive: true, force: true });
});

describe("email tokens", () => {
  it("stores only a hash of the token, and a token works once", async () => {
    const user = await createUser();
    const raw = await createEmailToken(user.id, "VERIFY_EMAIL", 60_000);

    const stored = await db.emailToken.findFirstOrThrow({ where: { userId: user.id } });
    expect(stored.tokenHash).toBe(sha256(raw));
    expect(JSON.stringify(stored)).not.toContain(raw);

    expect(await consumeEmailToken(raw, "VERIFY_EMAIL")).toEqual({ ok: true, userId: user.id });
    expect(await consumeEmailToken(raw, "VERIFY_EMAIL")).toEqual({ ok: false, reason: "used" });
  });

  it("rejects expired tokens, wrong purposes and unknown tokens", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const user = await createUser();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    const raw = await createEmailToken(user.id, "VERIFY_EMAIL", 60_000);
    expect(await consumeEmailToken(raw, "RESET_PASSWORD")).toEqual({ ok: false, reason: "invalid" });
    vi.setSystemTime(new Date("2026-01-01T00:01:01Z"));
    expect(await consumeEmailToken(raw, "VERIFY_EMAIL")).toEqual({ ok: false, reason: "expired" });
    vi.useRealTimers();
    expect(await consumeEmailToken("not-a-token", "VERIFY_EMAIL")).toEqual({ ok: false, reason: "invalid" });
  });

  it("issuing a new token revokes older unused ones of the same purpose", async () => {
    const user = await createUser();
    const first = await createEmailToken(user.id, "VERIFY_EMAIL", 60_000);
    const second = await createEmailToken(user.id, "VERIFY_EMAIL", 60_000);
    expect(await consumeEmailToken(first, "VERIFY_EMAIL")).toMatchObject({ ok: false });
    expect(await consumeEmailToken(second, "VERIFY_EMAIL")).toMatchObject({ ok: true });
  });
});

describe("verification flow", () => {
  it("registration sends a verification link that is valid for 24 hours", async () => {
    setClientIp("192.0.2.50");
    await registerUser(form({ name: "Grace", email: "grace@example.test", password: "long-enough-pw" }));

    const [mail] = outbox();
    expect(mail.to).toBe("grace@example.test");
    expect(mail.subject).toBe("Confirm your email for DevOps Tutor");
    expect(mail.text).toContain("http://localhost:3000/verify-email?token=");

    const token = await db.emailToken.findFirstOrThrow({ where: { user: { email: "grace@example.test" } } });
    const ttl = token.expiresAt.getTime() - token.createdAt.getTime();
    expect(ttl).toBe(24 * 60 * 60 * 1000);
  });

  it("opening the link marks the email verified; reopening it reports the link as used", async () => {
    setClientIp("192.0.2.51");
    await registerUser(form({ name: "Linus", email: "linus@example.test", password: "long-enough-pw" }));
    const token = tokenFromMail(outbox()[0]);

    await VerifyEmailPage({ searchParams: Promise.resolve({ token }) });
    const user = await db.user.findUniqueOrThrow({ where: { email: "linus@example.test" } });
    expect(user.emailVerified).toBeInstanceOf(Date);

    const first = renderToStaticMarkup(await VerifyEmailPage({ searchParams: Promise.resolve({ token: "bogus" }) }));
    expect(first).toContain("not valid");
    const again = renderToStaticMarkup(await VerifyEmailPage({ searchParams: Promise.resolve({ token }) }));
    expect(again).toContain("already been used");
  });

  it("resending requires a session, skips verified users, and is rate limited", async () => {
    expect(await resendVerificationEmail()).toEqual({ error: "Not signed in" });

    const verified = await createUser();
    await db.user.update({ where: { id: verified.id }, data: { emailVerified: new Date() } });
    asUser(verified.id);
    expect(await resendVerificationEmail()).toEqual({ ok: true, alreadyVerified: true });
    expect(outbox()).toHaveLength(0);

    const pending = await createUser();
    asUser(pending.id);
    for (let i = 0; i < 3; i++) expect(await resendVerificationEmail()).toEqual({ ok: true });
    expect(await resendVerificationEmail()).toEqual({ error: "Too many attempts. Please try again later." });
    expect(outbox()).toHaveLength(3);
  });
});
