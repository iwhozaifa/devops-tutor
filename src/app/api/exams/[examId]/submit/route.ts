import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  awardExamPassXp,
  processGamificationEvent,
} from "@/lib/gamification";

interface AnswerPayload {
  questionId: string;
  selectedOptionIds: string[];
}

interface ExamOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ examId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { examId } = await params;

  const body = await request.json();
  const answers: AnswerPayload[] = body.answers;
  const timeSpent: number = body.timeSpent ?? 0;

  if (!Array.isArray(answers)) {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  const exam = await db.exam.findUnique({
    where: { id: examId },
    include: {
      questions: { orderBy: { sortOrder: "asc" } },
    },
  });

  if (!exam) {
    return NextResponse.json({ error: "Exam not found" }, { status: 404 });
  }

  // Grade each question
  const results = exam.questions.map((question) => {
    const options = question.options as unknown as ExamOption[];
    const correctOptionIds = options
      .filter((o) => o.isCorrect)
      .map((o) => o.id)
      .sort();

    const userAnswer = answers.find((a) => a.questionId === question.id);
    const selectedOptionIds = (userAnswer?.selectedOptionIds ?? []).sort();

    const correct =
      correctOptionIds.length === selectedOptionIds.length &&
      correctOptionIds.every((id, i) => id === selectedOptionIds[i]);

    return {
      questionId: question.id,
      correct,
      selectedOptionIds: userAnswer?.selectedOptionIds ?? [],
      correctOptionIds,
      explanation: question.explanation,
    };
  });

  const correctCount = results.filter((r) => r.correct).length;
  const score = Math.round((correctCount / exam.questions.length) * 100);
  const passed = score >= exam.passingScore;

  // Save attempt
  await db.examAttempt.create({
    data: {
      userId: session.user.id,
      examId,
      score,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      answers: answers as any,
      passed,
      timeSpent,
    },
  });

  // Gamification: award XP and evaluate badges if passed
  let gamification = null;
  if (passed) {
    const xpAwarded = await awardExamPassXp(session.user.id, examId);
    const result = await processGamificationEvent(session.user.id);
    gamification = { xpAwarded, ...result };
  }

  return NextResponse.json({ score, passed, timeSpent, results, gamification });
}
