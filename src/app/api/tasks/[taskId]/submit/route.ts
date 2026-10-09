import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isEnrolled, notEnrolled } from "@/lib/enrollment";
import { awardXp } from "@/lib/gamification";
import { parseBody, taskSubmitSchema } from "@/lib/validation";

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

  const { data, error } = await parseBody(request, taskSubmitSchema);
  if (error) return error;
  const { status, notes } = data;

  // Verify task exists and belongs to a published subject
  const task = await db.dailyTask.findFirst({
    where: { id: taskId, day: { module: { subject: { isPublished: true } } } },
    include: { day: { select: { module: { select: { subjectId: true } } } } },
  });
  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }
  if (!(await isEnrolled(userId, task.day.module.subjectId))) {
    return notEnrolled();
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

  // Award XP once per task
  if (status === "COMPLETED") {
    await awardXp(
      userId,
      "TASK_COMPLETE",
      taskId,
      task.xpReward,
      `Completed task: ${task.title}`
    );
  }

  return NextResponse.json({ success: true, submission });
}
