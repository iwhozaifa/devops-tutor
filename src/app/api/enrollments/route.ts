import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { enrollmentSchema, parseBody } from "@/lib/validation";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await parseBody(request, enrollmentSchema);
    if (error) return error;
    const { subjectId } = data;

    // Verify subject exists and is published
    const subject = await db.subject.findFirst({
      where: { id: subjectId, isPublished: true },
    });

    if (!subject) {
      return NextResponse.json(
        { error: "Subject not found" },
        { status: 404 }
      );
    }

    // Upsert enrollment (idempotent)
    const enrollment = await db.enrollment.upsert({
      where: {
        userId_subjectId: {
          userId: session.user.id,
          subjectId,
        },
      },
      update: { status: "ACTIVE" },
      create: {
        userId: session.user.id,
        subjectId,
        status: "ACTIVE",
      },
    });

    return NextResponse.json(enrollment, { status: 201 });
  } catch (err) {
    logger.error("failed to enroll", { route: "/api/enrollments", err });
    return NextResponse.json(
      { error: "Failed to enroll" },
      { status: 500 }
    );
  }
}
