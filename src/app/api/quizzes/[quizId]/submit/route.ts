import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  awardQuizPassXp,
  processGamificationEvent,
} from "@/lib/gamification";

interface AnswerPayload {
  questionId: string;
  selectedOptionIds: string[];
}

interface QuizOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ quizId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { quizId } = await params;

  const body = await request.json();
  const answers: AnswerPayload[] = body.answers;

  if (!Array.isArray(answers)) {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  const quiz = await db.quiz.findUnique({
    where: { id: quizId },
    include: {
      questions: { orderBy: { sortOrder: "asc" } },
    },
  });

  if (!quiz) {
    return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
  }

  // Grade each question
  const results = quiz.questions.map((question) => {
    const options = question.options as unknown as QuizOption[];
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
  const score = Math.round((correctCount / quiz.questions.length) * 100);
  const passed = score >= quiz.passingScore;

  // Save attempt
  await db.quizAttempt.create({
    data: {
      userId: session.user.id,
      quizId,
      score,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      answers: answers as any,
      passed,
    },
  });

  return NextResponse.json({ score, passed, results });
}
