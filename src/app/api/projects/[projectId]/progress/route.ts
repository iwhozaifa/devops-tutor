import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

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

  const body = await request.json();
  const { stepCompleted } = body as { stepCompleted: number };

  if (typeof stepCompleted !== "number" || stepCompleted < 0) {
    return NextResponse.json({ error: "Invalid step" }, { status: 400 });
  }

  // Fetch project to validate
  const project = await db.project.findUnique({ where: { id: projectId } });
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
  const allComplete = newCurrentStep >= totalSteps;

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

  // Award step XP (50 XP per step) — check for duplicates
  const stepSourceId = `${projectId}-step-${stepCompleted}`;
  const existingStepXp = await db.xpLedger.findFirst({
    where: {
      userId,
      source: "PROJECT_STEP",
      sourceId: stepSourceId,
    },
  });

  if (!existingStepXp) {
    await db.xpLedger.create({
      data: {
        userId,
        amount: 50,
        source: "PROJECT_STEP",
        sourceId: stepSourceId,
        description: `Completed step ${stepCompleted + 1}: ${steps[stepCompleted]?.title}`,
      },
    });
  }

  // Award project completion XP if all steps done
  if (effectiveComplete) {
    const existingProjectXp = await db.xpLedger.findFirst({
      where: {
        userId,
        source: "PROJECT_COMPLETE",
        sourceId: projectId,
      },
    });

    if (!existingProjectXp) {
      await db.xpLedger.create({
        data: {
          userId,
          amount: project.xpReward,
          source: "PROJECT_COMPLETE",
          sourceId: projectId,
          description: `Completed project: ${project.title}`,
        },
      });
    }
  }

  return NextResponse.json({
    success: true,
    progress,
    projectComplete: effectiveComplete,
  });
}
