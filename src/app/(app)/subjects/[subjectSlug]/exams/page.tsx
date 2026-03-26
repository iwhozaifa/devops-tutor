import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Clock, Trophy, FileQuestion, Target } from "lucide-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";

interface ExamsPageProps {
  params: Promise<{ subjectSlug: string }>;
}

export default async function ExamsPage({ params }: ExamsPageProps) {
  const { subjectSlug } = await params;
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const subject = await db.subject.findUnique({
    where: { slug: subjectSlug },
    include: {
      certifications: {
        include: {
          exams: {
            include: {
              attempts: {
                where: { userId: session.user.id },
                orderBy: { score: "desc" },
                take: 1,
              },
            },
          },
        },
      },
    },
  });

  if (!subject) notFound();

  const allExams = subject.certifications.flatMap((cert) =>
    cert.exams.map((exam) => ({
      ...exam,
      certificationTitle: cert.title,
    }))
  );

  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link
          href={`/subjects/${subjectSlug}`}
          className="hover:text-foreground"
        >
          {subject.title}
        </Link>
        <span>/</span>
        <span className="text-foreground">Practice Exams</span>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Practice Exams</h1>
        <p className="mt-2 text-muted-foreground">
          Timed practice exams to prepare for your certification.
        </p>
      </div>

      {/* Exam cards */}
      {allExams.length === 0 ? (
        <div className="rounded-lg border bg-card p-8 text-center">
          <FileQuestion className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <p className="text-muted-foreground">
            No practice exams available yet.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {allExams.map((exam) => {
            const bestAttempt = exam.attempts[0] ?? null;
            return (
              <div
                key={exam.id}
                className="flex flex-col rounded-lg border bg-card p-6 shadow-sm"
              >
                <p className="mb-1 text-xs font-medium text-primary">
                  {exam.certificationTitle}
                </p>
                <h3 className="text-lg font-semibold">{exam.title}</h3>
                {exam.description && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {exam.description}
                  </p>
                )}

                <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {exam.timeLimit} min
                  </span>
                  <span className="flex items-center gap-1">
                    <FileQuestion className="h-4 w-4" />
                    {exam.questionCount} questions
                  </span>
                  <span className="flex items-center gap-1">
                    <Target className="h-4 w-4" />
                    {exam.passingScore}% to pass
                  </span>
                </div>

                {bestAttempt && (
                  <div className="mt-3 flex items-center gap-2">
                    <Trophy
                      className={`h-4 w-4 ${
                        bestAttempt.passed ? "text-green-500" : "text-red-400"
                      }`}
                    />
                    <span className="text-sm">
                      Best: {bestAttempt.score}%
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        bestAttempt.passed
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {bestAttempt.passed ? "Passed" : "Failed"}
                    </span>
                  </div>
                )}

                <div className="mt-auto pt-4">
                  <Button asChild className="w-full">
                    <Link
                      href={`/subjects/${subjectSlug}/exams/${exam.id}`}
                    >
                      Start Exam
                    </Link>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
