import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { dayId, status } = body;

    if (!dayId || !status) {
      return NextResponse.json(
        { error: "dayId and status are required" },
        { status: 400 }
      );
    }

    if (!["NOT_STARTED", "IN_PROGRESS", "COMPLETED"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status" },
        { status: 400 }
      );
    }

    // Verify day exists
    const day = await db.day.findUnique({ where: { id: dayId } });
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

    // Award XP on completion
    if (isCompleting) {
      await db.xpLedger.create({
        data: {
          userId: session.user.id,
          amount: 100,
          source: "DAY_COMPLETE",
          sourceId: dayId,
          description: `Completed day: ${day.title}`,
        },
      });

      // Update streak
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      await db.streak.upsert({
        where: { userId: session.user.id },
        update: {
          currentStreak: { increment: 1 },
          longestStreak: {
            increment: 0, // handled below
          },
          lastActiveDate: today,
        },
        create: {
          userId: session.user.id,
          currentStreak: 1,
          longestStreak: 1,
          lastActiveDate: today,
        },
      });

      // Ensure longestStreak >= currentStreak
      const streak = await db.streak.findUnique({
        where: { userId: session.user.id },
      });
      if (streak && streak.currentStreak > streak.longestStreak) {
        await db.streak.update({
          where: { userId: session.user.id },
          data: { longestStreak: streak.currentStreak },
        });
      }
    }

    return NextResponse.json(progress);
  } catch {
    return NextResponse.json(
      { error: "Failed to update progress" },
      { status: 500 }
    );
  }
}
