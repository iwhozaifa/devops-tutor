import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { listAuditLog, recordAdminAction, setUserRole } from "@/lib/audit";
import AdminUsersPage from "@/app/(admin)/admin/users/page";
import AdminAuditPage from "@/app/(admin)/admin/audit/page";
import { asUser } from "../helpers/auth";
import { createUser } from "../helpers/fixtures";

const cli = { id: null, label: "cli:ops" };

describe("setUserRole", () => {
  it("promotes a user and records who did it, from what, to what", async () => {
    const target = await createUser({ email: "promote.me@example.test" });

    const result = await setUserRole({ email: "Promote.Me@example.test", role: "ADMIN", actor: cli });

    expect(result).toEqual({ changed: true, userId: target.id, from: "USER", to: "ADMIN" });
    expect((await db.user.findUniqueOrThrow({ where: { id: target.id } })).role).toBe("ADMIN");
    const [entry] = await db.adminAuditLog.findMany();
    expect(entry).toMatchObject({
      action: "ROLE_GRANTED",
      actorId: null,
      actorLabel: "cli:ops",
      targetUserId: target.id,
      targetLabel: "promote.me@example.test",
      metadata: { from: "USER", to: "ADMIN" },
    });
  });

  it("records a demotion as ROLE_REVOKED with the acting admin", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const target = await createUser({ role: "ADMIN" });

    await setUserRole({ email: target.email!, role: "USER", actor: { id: admin.id, label: admin.email! } });

    const [entry] = await db.adminAuditLog.findMany();
    expect(entry).toMatchObject({ action: "ROLE_REVOKED", actorId: admin.id, targetUserId: target.id });
  });

  it("does not log a change that changes nothing, and rejects unknown users", async () => {
    const target = await createUser({ role: "ADMIN" });
    expect(await setUserRole({ email: target.email!, role: "ADMIN", actor: cli })).toMatchObject({ changed: false });
    expect(await db.adminAuditLog.count()).toBe(0);

    await expect(setUserRole({ email: "ghost@example.test", role: "ADMIN", actor: cli })).rejects.toThrow(
      "No user with email ghost@example.test"
    );
  });

  it("keeps entries when the actor or target account is deleted", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const target = await createUser();
    await setUserRole({ email: target.email!, role: "ADMIN", actor: { id: admin.id, label: admin.email! } });

    await db.user.deleteMany({ where: { id: { in: [admin.id, target.id] } } });

    const [entry] = await db.adminAuditLog.findMany();
    expect(entry).toMatchObject({ action: "ROLE_GRANTED", actorId: null, targetUserId: null });
  });
});

describe("admin:promote CLI", () => {
  it("changes the role through setUserRole and attributes it to the operator", async () => {
    const target = await createUser({ email: "cli.target@example.test" });
    execFileSync("npx", ["tsx", "scripts/promote-admin.ts", "cli.target@example.test", "--by", "alice"], {
      env: { ...process.env },
      stdio: "pipe",
    });
    expect((await db.user.findUniqueOrThrow({ where: { id: target.id } })).role).toBe("ADMIN");
    const [entry] = await db.adminAuditLog.findMany();
    expect(entry).toMatchObject({ action: "ROLE_GRANTED", actorLabel: "cli:alice", targetUserId: target.id });
  });
});

describe("admin pages", () => {
  it("logs every view of the user list with its search and page", async () => {
    const admin = await createUser({ role: "ADMIN" });
    asUser(admin.id);

    await AdminUsersPage({ searchParams: Promise.resolve({ q: "ada", page: "2" }) });

    const [entry] = await db.adminAuditLog.findMany();
    expect(entry).toMatchObject({
      action: "USER_LIST_VIEWED",
      actorId: admin.id,
      actorLabel: admin.email,
      metadata: { query: "ada", page: 2 },
    });
  });

  it("keeps the audit page admin-only", async () => {
    asUser((await createUser()).id);
    await expect(AdminAuditPage({ searchParams: Promise.resolve({}) })).rejects.toThrow(/NEXT_REDIRECT/);
  });
});

describe("listAuditLog", () => {
  it("returns newest first, paginated", async () => {
    for (let i = 0; i < 3; i++) {
      await recordAdminAction({ actor: cli, action: "USER_LIST_VIEWED", metadata: { i } });
    }
    const page1 = await listAuditLog({ page: 1, pageSize: 2 });
    const page2 = await listAuditLog({ page: 2, pageSize: 2 });
    expect(page1.total).toBe(3);
    expect(page1.entries.map((e) => (e.metadata as { i: number }).i)).toEqual([2, 1]);
    expect(page2.entries.map((e) => (e.metadata as { i: number }).i)).toEqual([0]);
  });
});
