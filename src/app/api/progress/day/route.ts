import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { awardXp, recordStreakActivity } from "@/lib/gamification";
import { dayProgressSchema, parseBody } from "@/lib/validation";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await parseBody(request, dayProgressSchema);
    if (error) return error;
    const { dayId, status } = data;

    // Verify day exists and belongs to a published subject
    const day = await db.day.findFirst({
      where: { id: dayId, module: { subject: { isPublished: true } } },
    });
    if (!day) {
      return NextResponse.json({ error: "Day not found" }, { status: 404 });
    }

    const isCompleting = status === "COMPLETED";

    const progress = await db.dayProgress.upsert({
      where: {
        userId_dayId: {
          userId: session.user.id,
          dayId,
        },
      },
      update: {
        status,
        completedAt: isCompleting ? new Date() : null,
      },
      create: {
        userId: session.user.id,
        dayId,
        status,
        completedAt: isCompleting ? new Date() : null,
      },
    });

    if (isCompleting) {
      // XP is awarded once per day, even if it is un-completed and re-completed
      await awardXp(
        session.user.id,
        "DAY_COMPLETE",
        dayId,
        100,
        `Completed day: ${day.title}`
      );
      await recordStreakActivity(session.user.id);
    }

    return NextResponse.json(progress);
  } catch {
    return NextResponse.json(
      { error: "Failed to update progress" },
      { status: 500 }
    );
  }
}
