import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  awardQuizPassXp,
  processGamificationEvent,
} from "@/lib/gamification";
import { gradeAnswers } from "@/lib/grading";
import { parseBody, quizSubmitSchema } from "@/lib/validation";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ quizId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { quizId } = await params;

  const { data, error } = await parseBody(request, quizSubmitSchema);
  if (error) return error;
  const { answers } = data;

  const quiz = await db.quiz.findFirst({
    where: { id: quizId, day: { module: { subject: { isPublished: true } } } },
    include: {
      questions: { orderBy: { sortOrder: "asc" } },
    },
  });

  if (!quiz || quiz.questions.length === 0) {
    return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
  }

  const { results, score } = gradeAnswers(quiz.questions, answers);
  const passed = score >= quiz.passingScore;

  // Save attempt (only answers to this quiz's questions)
  const questionIds = new Set(quiz.questions.map((q) => q.id));
  await db.quizAttempt.create({
    data: {
      userId: session.user.id,
      quizId,
      score,
      answers: answers.filter((a) => questionIds.has(a.questionId)),
      passed,
    },
  });

  // Gamification: award XP (first pass only) and evaluate badges if passed
  let gamification = null;
  if (passed) {
    const xpAwarded = await awardQuizPassXp(
      session.user.id,
      quizId,
      score,
      quiz.passingScore
    );
    const result = await processGamificationEvent(session.user.id);
    gamification = { xpAwarded, ...result };
  }

  return NextResponse.json({ score, passed, results, gamification });
}
