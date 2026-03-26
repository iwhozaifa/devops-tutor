import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Trophy, Clock } from "lucide-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { QuizPlayer } from "@/components/quiz/QuizPlayer";

interface QuizPageProps {
  params: Promise<{ subjectSlug: string; quizId: string }>;
}

export default async function QuizPage({ params }: QuizPageProps) {
  const { subjectSlug, quizId } = await params;
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const quiz = await db.quiz.findUnique({
    where: { id: quizId },
    include: {
      questions: { orderBy: { sortOrder: "asc" } },
      day: {
        include: {
          module: {
            include: {
              subject: true,
            },
          },
        },
      },
    },
  });

  if (!quiz || quiz.day.module.subject.slug !== subjectSlug) {
    notFound();
  }

  const previousAttempts = await db.quizAttempt.findMany({
    where: { userId: session.user.id, quizId },
    orderBy: { completedAt: "desc" },
    take: 5,
  });

  const subject = quiz.day.module.subject;
  const module = quiz.day.module;
  const day = quiz.day;

  // Prepare quiz data for client (strip isCorrect from options)
  const quizData = {
    id: quiz.id,
    title: quiz.title,
    passingScore: quiz.passingScore,
    dayId: quiz.dayId,
    questions: quiz.questions.map((q) => ({
      id: q.id,
      questionText: q.questionText,
      questionType: q.questionType as
        | "SINGLE_CHOICE"
        | "MULTIPLE_CHOICE"
        | "TRUE_FALSE",
      options: (q.options as { id: string; text: string; isCorrect: boolean }[]).map(
        (o) => ({ id: o.id, text: o.text, isCorrect: false })
      ),
      explanation: q.explanation,
    })),
  };

  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <Link
          href={`/subjects/${subjectSlug}`}
          className="hover:text-foreground"
        >
          {subject.title}
        </Link>
        <span>/</span>
        <span>{module.title}</span>
        <span>/</span>
        <Link
          href={`/subjects/${subjectSlug}/curriculum/${day.dayNumber}`}
          className="hover:text-foreground"
        >
          Day {day.dayNumber}
        </Link>
        <span>/</span>
        <span className="text-foreground">Quiz</span>
      </div>

      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold">{quiz.title}</h1>
        {quiz.description && (
          <p className="mt-2 text-muted-foreground">{quiz.description}</p>
        )}
        <div className="mt-3 flex items-center gap-4 text-sm text-muted-foreground">
          <span>{quiz.questions.length} questions</span>
          <span>Passing score: {quiz.passingScore}%</span>
        </div>
      </div>

      {/* Quiz Player */}
      <QuizPlayer
        quiz={quizData}
        subjectSlug={subjectSlug}
        dayNumber={day.dayNumber}
      />

      {/* Previous attempts */}
      {previousAttempts.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Previous Attempts</h2>
          <div className="space-y-2">
            {previousAttempts.map((attempt) => (
              <div
                key={attempt.id}
                className="flex items-center justify-between rounded-lg border bg-card p-4 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <Trophy
                    className={`h-5 w-5 ${
                      attempt.passed ? "text-green-500" : "text-red-400"
                    }`}
                  />
                  <div>
                    <p className="text-sm font-medium">
                      Score: {attempt.score}%
                    </p>
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {new Date(attempt.completedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    attempt.passed
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {attempt.passed ? "Passed" : "Failed"}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
