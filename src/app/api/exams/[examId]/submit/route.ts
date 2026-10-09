import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  awardExamPassXp,
  processGamificationEvent,
} from "@/lib/gamification";
import { gradeAnswers } from "@/lib/grading";
import { examSubmitSchema, parseBody } from "@/lib/validation";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ examId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { examId } = await params;

  const { data, error } = await parseBody(request, examSubmitSchema);
  if (error) return error;
  const { answers } = data;

  const exam = await db.exam.findFirst({
    where: { id: examId, certification: { subject: { isPublished: true } } },
    include: {
      questions: { orderBy: { sortOrder: "asc" } },
    },
  });

  if (!exam || exam.questions.length === 0) {
    return NextResponse.json({ error: "Exam not found" }, { status: 404 });
  }

  // timeSpent is client-reported; clamp to the exam's time limit
  const timeSpent = Math.min(data.timeSpent, exam.timeLimit * 60);

  const { results, score } = gradeAnswers(exam.questions, answers);
  const passed = score >= exam.passingScore;

  // Save attempt (only answers to this exam's questions)
  const questionIds = new Set(exam.questions.map((q) => q.id));
  await db.examAttempt.create({
    data: {
      userId: session.user.id,
      examId,
      score,
      answers: answers.filter((a) => questionIds.has(a.questionId)),
      passed,
      timeSpent,
    },
  });

  // Gamification: award XP (first pass only) and evaluate badges if passed
  let gamification = null;
  if (passed) {
    const xpAwarded = await awardExamPassXp(session.user.id, examId);
    const result = await processGamificationEvent(session.user.id);
    gamification = { xpAwarded, ...result };
  }

  return NextResponse.json({ score, passed, timeSpent, results, gamification });
}
