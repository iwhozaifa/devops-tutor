import { NextResponse } from "next/server";
import { db } from "./db";

export async function isEnrolled(userId: string, subjectId: string): Promise<boolean> {
  const enrollment = await db.enrollment.findUnique({
    where: { userId_subjectId: { userId, subjectId } },
    select: { id: true },
  });
  return enrollment !== null;
}

/** 403 for progress or XP in a subject the learner has not enrolled in. */
export function notEnrolled() {
  return NextResponse.json({ error: "Not enrolled" }, { status: 403 });
}
