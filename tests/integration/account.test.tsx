import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { db } from "@/lib/db";
import { GET as exportAccount } from "@/app/api/account/export/route";
import { deleteAccount } from "@/lib/account-actions";
import { setUserRole } from "@/lib/audit";
import PrivacyPage from "@/app/privacy/page";
import TermsPage from "@/app/terms/page";
import RegisterPage from "@/app/(auth)/register/page";
import { asUser, signOut } from "../helpers/auth";
import { createCurriculum, createUser, enroll, PASSWORD } from "../helpers/fixtures";

const form = (fields: Record<string, string>) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
};

async function learnerWithActivity() {
  const c = await createCurriculum();
  const user = await createUser({ email: "learner@example.test" });
  await enroll(user.id, c.subject.id);
  await db.dayProgress.create({ data: { userId: user.id, dayId: c.day.id, status: "COMPLETED" } });
  await db.quizAttempt.create({ data: { userId: user.id, quizId: c.quiz.id, score: 100, passed: true, answers: [] } });
  await db.xpLedger.create({ data: { userId: user.id, source: "DAY_COMPLETE", sourceId: c.day.id, amount: 100, description: "Day" } });
  return { c, user };
}

describe("GET /api/account/export", () => {
  it("requires a session", async () => {
    expect((await exportAccount()).status).toBe(401);
  });

  it("downloads the caller's own data, without secrets or other learners' data", async () => {
    const { user } = await learnerWithActivity();
    const other = await createUser({ email: "someone.else@example.test" });
    await db.xpLedger.create({ data: { userId: other.id, source: "DAY_COMPLETE", sourceId: "x", amount: 5, description: "Other" } });
    asUser(user.id);

    const res = await exportAccount();
    expect(res.status).toBe(200);
    expect(res.headers.get("content-disposition")).toMatch(/^attachment; filename="devops-tutor-export-\d{4}-\d{2}-\d{2}\.json"$/);
    expect(res.headers.get("cache-control")).toBe("no-store");

    const body = await res.text();
    const data = JSON.parse(body);
    expect(data.profile).toMatchObject({ id: user.id, email: "learner@example.test" });
    expect(data.enrollments).toHaveLength(1);
    expect(data.dayProgress).toHaveLength(1);
    expect(data.quizAttempts).toHaveLength(1);
    expect(data.xpLedger).toHaveLength(1);
    expect(data).toHaveProperty("examAttempts");
    expect(data).toHaveProperty("taskSubmissions");
    expect(data).toHaveProperty("projectProgress");
    expect(data).toHaveProperty("badges");
    expect(body).not.toContain("passwordHash");
    expect(body).not.toContain(user.passwordHash!);
    expect(body).not.toContain("someone.else@example.test");
  });
});

describe("deleteAccount", () => {
  it("requires the current password and deletes everything about the learner", async () => {
    const { user } = await learnerWithActivity();
    asUser(user.id);

    expect(await deleteAccount(form({ confirm: "wrong-password" }))).toEqual({ error: "That password is not correct" });
    expect(await db.user.count({ where: { id: user.id } })).toBe(1);

    await deleteAccount(form({ confirm: PASSWORD }));

    expect(await db.user.count({ where: { id: user.id } })).toBe(0);
    for (const count of [
      db.enrollment.count({ where: { userId: user.id } }),
      db.dayProgress.count({ where: { userId: user.id } }),
      db.quizAttempt.count({ where: { userId: user.id } }),
      db.xpLedger.count({ where: { userId: user.id } }),
    ]) {
      expect(await count).toBe(0);
    }
    expect(signOut).toHaveBeenCalledWith({ redirectTo: "/?deleted=1" });
  });

  it("asks OAuth-only accounts to type their email instead", async () => {
    const user = await db.user.create({ data: { email: "oauth@example.test" } });
    asUser(user.id);
    expect(await deleteAccount(form({ confirm: "someone@example.test" }))).toEqual({
      error: "Type your email address exactly to confirm",
    });
    await deleteAccount(form({ confirm: "OAuth@Example.test" }));
    expect(await db.user.count({ where: { id: user.id } })).toBe(0);
  });

  it("removes the learner's email from the audit log but keeps the entries", async () => {
    const user = await createUser({ email: "former@example.test" });
    await setUserRole({ email: user.email, role: "ADMIN", actor: { id: null, label: "cli:ops" } });
    asUser(user.id);

    await deleteAccount(form({ confirm: PASSWORD }));

    const [entry] = await db.adminAuditLog.findMany();
    expect(entry).toMatchObject({ action: "ROLE_GRANTED", targetUserId: null, targetLabel: "deleted user" });
    expect(JSON.stringify(entry)).not.toContain("former@example.test");
  });

  it("limits confirmation attempts so the form cannot be used to guess the password", async () => {
    const user = await createUser();
    asUser(user.id);
    for (let i = 0; i < 5; i++) await deleteAccount(form({ confirm: "guess" + i }));
    expect(await deleteAccount(form({ confirm: PASSWORD }))).toEqual({
      error: "Too many attempts. Please try again later.",
    });
    expect(await db.user.count({ where: { id: user.id } })).toBe(1);
  });

  it("requires a session", async () => {
    expect(await deleteAccount(form({ confirm: "x" }))).toEqual({ error: "Not signed in" });
  });
});

describe("legal pages", () => {
  it("render, and registration links to them", async () => {
    expect(renderToStaticMarkup(await PrivacyPage())).toContain("Privacy policy");
    expect(renderToStaticMarkup(await TermsPage())).toContain("Terms of use");
    const register = renderToStaticMarkup(<RegisterPage />);
    expect(register).toContain('href="/privacy"');
    expect(register).toContain('href="/terms"');
  });
});
