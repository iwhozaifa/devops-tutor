import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { ResourceList } from "@/components/curriculum/ResourceList";
import { DayCompleteButton } from "@/components/curriculum/DayCompleteButton";
import { TaskCard } from "@/components/curriculum/TaskCard";

interface DayPageProps {
  params: Promise<{ subjectSlug: string; dayNumber: string }>;
}

export default async function DayPage({ params }: DayPageProps) {
  const { subjectSlug, dayNumber: dayNumStr } = await params;
  const dayNumber = parseInt(dayNumStr, 10);
  if (isNaN(dayNumber)) notFound();

  const session = await auth();
  const userId = session?.user?.id;

  const subject = await db.subject.findUnique({
    where: { slug: subjectSlug },
    include: {
      modules: {
        include: {
          days: {
            orderBy: { dayNumber: "asc" },
          },
        },
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  if (!subject) notFound();

  // Flatten all days to find current, prev, next
  const allDays = subject.modules.flatMap((m) =>
    m.days.map((d) => ({ ...d, moduleTitle: m.title }))
  );
  const currentIndex = allDays.findIndex((d) => d.dayNumber === dayNumber);
  if (currentIndex === -1) notFound();

  const currentDay = allDays[currentIndex];
  const prevDay = currentIndex > 0 ? allDays[currentIndex - 1] : null;
  const nextDay =
    currentIndex < allDays.length - 1 ? allDays[currentIndex + 1] : null;

  // Fetch full day data with relations
  const day = await db.day.findUnique({
    where: { id: currentDay.id },
    include: {
      resources: { orderBy: { sortOrder: "asc" } },
      quizzes: { orderBy: { sortOrder: "asc" } },
      tasks: { orderBy: { sortOrder: "asc" } },
      progress: userId ? { where: { userId } } : false,
    },
  });

  if (!day) notFound();

  // Fetch task submissions for current user
  let taskSubmissions: Record<string, { id: string; status: string; notes: string | null; submittedAt: Date }> = {};
  if (userId && day.tasks.length > 0) {
    const submissions = await db.taskSubmission.findMany({
      where: {
        userId,
        taskId: { in: day.tasks.map((t) => t.id) },
      },
    });
    for (const sub of submissions) {
      taskSubmissions[sub.taskId] = {
        id: sub.id,
        status: sub.status,
        notes: sub.notes,
        submittedAt: sub.submittedAt,
      };
    }
  }

  const progress =
    "progress" in day && Array.isArray(day.progress) ? day.progress[0] : null;
  const isCompleted = progress?.status === "COMPLETED";

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
        <span>{currentDay.moduleTitle}</span>
        <span>/</span>
        <span className="text-foreground">Day {dayNumber}</span>
      </div>

      {/* Header */}
      <div>
        <p className="text-sm font-medium text-primary">Day {dayNumber}</p>
        <h1 className="mt-1 text-2xl font-bold">{day.title}</h1>
        <p className="mt-2 text-muted-foreground">{day.summary}</p>
      </div>

      {/* Resources */}
      {day.resources.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Resources</h2>
          <ResourceList resources={day.resources} />
        </section>
      )}

      {/* Quizzes */}
      {day.quizzes.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Quizzes</h2>
          <div className="space-y-2">
            {day.quizzes.map((quiz) => (
              <div
                key={quiz.id}
                className="flex items-center justify-between rounded-lg border bg-card p-4"
              >
                <div>
                  <p className="font-medium">{quiz.title}</p>
                  {quiz.description && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {quiz.description}
                    </p>
                  )}
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link
                    href={`/subjects/${subjectSlug}/quizzes/${quiz.id}`}
                  >
                    Take Quiz
                  </Link>
                </Button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Tasks */}
      {day.tasks.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Tasks</h2>
          <div className="space-y-4">
            {day.tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={{
                  id: task.id,
                  title: task.title,
                  description: task.description,
                  difficulty: task.difficulty,
                  xpReward: task.xpReward,
                  hints: task.hints as string[] | null,
                  solution: task.solution,
                }}
                submission={
                  taskSubmissions[task.id]
                    ? {
                        id: taskSubmissions[task.id].id,
                        status: taskSubmissions[task.id].status as "ATTEMPTED" | "COMPLETED" | "SKIPPED",
                        notes: taskSubmissions[task.id].notes,
                        submittedAt: taskSubmissions[task.id].submittedAt,
                      }
                    : null
                }
              />
            ))}
          </div>
        </section>
      )}

      {/* Mark Complete */}
      {userId && (
        <div className="rounded-lg border bg-card p-5">
          <DayCompleteButton dayId={day.id} isCompleted={isCompleted} />
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between border-t pt-6">
        {prevDay ? (
          <Button variant="outline" size="sm" asChild>
            <Link
              href={`/subjects/${subjectSlug}/curriculum/${prevDay.dayNumber}`}
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              Day {prevDay.dayNumber}
            </Link>
          </Button>
        ) : (
          <div />
        )}
        {nextDay ? (
          <Button variant="outline" size="sm" asChild>
            <Link
              href={`/subjects/${subjectSlug}/curriculum/${nextDay.dayNumber}`}
            >
              Day {nextDay.dayNumber}
              <ChevronRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        ) : (
          <div />
        )}
      </div>
    </div>
  );
}
