import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/account/export: everything stored about the signed-in learner,
// as a JSON download (data portability). Never includes the password hash.
export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const where = { userId };
  const [profile, enrollments, dayProgress, quizAttempts, examAttempts, taskSubmissions, projectProgress, xpLedger, badges, streak] =
    await Promise.all([
      db.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, email: true, emailVerified: true, image: true, role: true, createdAt: true, updatedAt: true },
      }),
      db.enrollment.findMany({ where, include: { subject: { select: { slug: true, title: true } } } }),
      db.dayProgress.findMany({ where }),
      db.quizAttempt.findMany({ where }),
      db.examAttempt.findMany({ where }),
      db.taskSubmission.findMany({ where }),
      db.projectProgress.findMany({ where }),
      db.xpLedger.findMany({ where, orderBy: { createdAt: "asc" } }),
      db.userBadge.findMany({ where, include: { badge: { select: { slug: true, title: true } } } }),
      db.streak.findUnique({ where }),
    ]);
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = JSON.stringify(
    { exportedAt: new Date().toISOString(), profile, enrollments, dayProgress, quizAttempts, examAttempts, taskSubmissions, projectProgress, xpLedger, badges, streak },
    null,
    2
  );
  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(body, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="devops-tutor-export-${date}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
