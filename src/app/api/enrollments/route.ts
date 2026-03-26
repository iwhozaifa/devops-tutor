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
    const { subjectId } = body;

    if (!subjectId) {
      return NextResponse.json(
        { error: "subjectId is required" },
        { status: 400 }
      );
    }

    // Verify subject exists
    const subject = await db.subject.findUnique({
      where: { id: subjectId },
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
  } catch {
    return NextResponse.json(
      { error: "Failed to enroll" },
      { status: 500 }
    );
  }
}
