import type { AdminAction, Prisma, Role } from "@/generated/prisma/client";
import { db } from "./db";

/** Who acted: a signed-in admin (id + email) or an operator on the CLI (id null). */
export interface AuditActor {
  id: string | null;
  label: string;
}

export async function recordAdminAction(input: {
  actor: AuditActor;
  action: AdminAction;
  target?: { id: string; label: string } | null;
  metadata?: Prisma.InputJsonValue;
}) {
  return db.adminAuditLog.create({
    data: {
      action: input.action,
      actorId: input.actor.id,
      actorLabel: input.actor.label,
      targetUserId: input.target?.id ?? null,
      targetLabel: input.target?.label ?? null,
      metadata: input.metadata,
    },
  });
}

/** Changes a user's role and records it in the same transaction. */
export async function setUserRole({ email, role, actor }: { email: string; role: Role; actor: AuditActor }) {
  const normalized = email.trim().toLowerCase();
  return db.$transaction(async (tx) => {
    const user = await tx.user.findFirst({
      where: { email: { equals: normalized, mode: "insensitive" } },
      select: { id: true, email: true, role: true },
    });
    if (!user) throw new Error(`No user with email ${normalized}`);
    if (user.role === role) return { changed: false as const, userId: user.id, from: user.role, to: role };

    await tx.user.update({ where: { id: user.id }, data: { role } });
    await tx.adminAuditLog.create({
      data: {
        action: role === "ADMIN" ? "ROLE_GRANTED" : "ROLE_REVOKED",
        actorId: actor.id,
        actorLabel: actor.label,
        targetUserId: user.id,
        targetLabel: user.email,
        metadata: { from: user.role, to: role },
      },
    });
    return { changed: true as const, userId: user.id, from: user.role, to: role };
  });
}

export async function listAuditLog({ page, pageSize = 50 }: { page: number; pageSize?: number }) {
  const [entries, total] = await Promise.all([
    db.adminAuditLog.findMany({
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.adminAuditLog.count(),
  ]);
  return { entries, total };
}
