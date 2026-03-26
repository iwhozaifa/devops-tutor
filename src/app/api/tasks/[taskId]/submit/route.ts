import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { taskId } = await params;
  const userId = session.user.id;

  const body = await request.json();
  const { status, notes } = body as {
    status: "COMPLETED" | "ATTEMPTED" | "SKIPPED";
    notes?: string;
  };

  if (!["COMPLETED", "ATTEMPTED", "SKIPPED"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  // Verify task exists
  const task = await db.dailyTask.findUnique({ where: { id: taskId } });
  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  // Upsert submission
  const submission = await db.taskSubmission.upsert({
    where: {
      userId_taskId: { userId, taskId },
    },
    create: {
      userId,
      taskId,
      status,
      notes: notes || null,
    },
    update: {
      status,
      notes: notes || null,
      submittedAt: new Date(),
    },
  });

  // Award XP if completed
  if (status === "COMPLETED") {
    // Check if XP was already awarded for this task
    const existingXp = await db.xpLedger.findFirst({
      where: {
        userId,
        source: "TASK_COMPLETE",
        sourceId: taskId,
      },
    });

    if (!existingXp) {
      await db.xpLedger.create({
        data: {
          userId,
          amount: task.xpReward,
          source: "TASK_COMPLETE",
          sourceId: taskId,
          description: `Completed task: ${task.title}`,
        },
      });
    }
  }

  return NextResponse.json({ success: true, submission });
}
