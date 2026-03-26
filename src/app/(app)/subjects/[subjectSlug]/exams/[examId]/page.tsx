import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Trophy, Clock, Timer } from "lucide-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ExamPlayer } from "@/components/exam/ExamPlayer";

interface ExamPageProps {
  params: Promise<{ subjectSlug: string; examId: string }>;
}

export default async function ExamPage({ params }: ExamPageProps) {
  const { subjectSlug, examId } = await params;
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const exam = await db.exam.findUnique({
    where: { id: examId },
    include: {
      questions: { orderBy: { sortOrder: "asc" } },
      certification: {
        include: {
          subject: true,
        },
      },
    },
  });

  if (!exam || exam.certification.subject.slug !== subjectSlug) {
    notFound();
  }

  const previousAttempts = await db.examAttempt.findMany({
    where: { userId: session.user.id, examId },
    orderBy: { completedAt: "desc" },
    take: 5,
  });

  // Prepare exam data for client (strip isCorrect)
  const examData = {
    id: exam.id,
    title: exam.title,
    timeLimit: exam.timeLimit,
    passingScore: exam.passingScore,
    questionCount: exam.questionCount,
    questions: exam.questions.map((q) => ({
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
      domain: q.domain,
    })),
  };

  function formatTime(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  }

  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <Link
          href={`/subjects/${subjectSlug}`}
          className="hover:text-foreground"
        >
          {exam.certification.subject.title}
        </Link>
        <span>/</span>
        <Link
          href={`/subjects/${subjectSlug}/exams`}
          className="hover:text-foreground"
        >
          Practice Exams
        </Link>
        <span>/</span>
        <span className="text-foreground">{exam.title}</span>
      </div>

      {/* Exam Player */}
      <ExamPlayer exam={examData} subjectSlug={subjectSlug} />

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
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(attempt.completedAt).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <Timer className="h-3 w-3" />
                        {formatTime(attempt.timeSpent)}
                      </span>
                    </div>
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
