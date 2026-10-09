import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { awardXp } from "@/lib/gamification";
import { parseBody, projectProgressSchema } from "@/lib/validation";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await params;
  const userId = session.user.id;

  const { data, error } = await parseBody(request, projectProgressSchema);
  if (error) return error;
  const { stepCompleted } = data;

  // Fetch project to validate (must belong to a published subject)
  const project = await db.project.findFirst({
    where: { id: projectId, subject: { isPublished: true } },
  });
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const steps = project.steps as Array<{
    stepNumber: number;
    title: string;
    description: string;
    checkpoints: string[];
  }>;
  const totalSteps = steps.length;

  if (stepCompleted >= totalSteps) {
    return NextResponse.json({ error: "Invalid step number" }, { status: 400 });
  }

  const newCurrentStep = stepCompleted + 1;

  // Get existing progress to determine max step
  const existing = await db.projectProgress.findUnique({
    where: { userId_projectId: { userId, projectId } },
  });

  const effectiveStep = existing
    ? Math.max(existing.currentStep, newCurrentStep)
    : newCurrentStep;

  const effectiveComplete = effectiveStep >= totalSteps;

  // Upsert progress
  const progress = await db.projectProgress.upsert({
    where: {
      userId_projectId: { userId, projectId },
    },
    create: {
      userId,
      projectId,
      currentStep: effectiveStep,
      status: effectiveComplete ? "COMPLETED" : "IN_PROGRESS",
      completedAt: effectiveComplete ? new Date() : null,
    },
    update: {
      currentStep: effectiveStep,
      status: effectiveComplete ? "COMPLETED" : "IN_PROGRESS",
      completedAt: effectiveComplete ? new Date() : undefined,
    },
  });

  // Award step XP (50 XP per step) — once per step
  await awardXp(
    userId,
    "PROJECT_STEP",
    `${projectId}-step-${stepCompleted}`,
    50,
    `Completed step ${stepCompleted + 1}: ${steps[stepCompleted]?.title}`
  );

  // Award project completion XP if all steps done — once per project
  if (effectiveComplete) {
    await awardXp(
      userId,
      "PROJECT_COMPLETE",
      projectId,
      project.xpReward,
      `Completed project: ${project.title}`
    );
  }

  return NextResponse.json({
    success: true,
    progress,
    projectComplete: effectiveComplete,
  });
}
