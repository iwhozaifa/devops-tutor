import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { EnrollButton } from "@/components/EnrollButton";
import { ModuleAccordion } from "@/components/curriculum/ModuleAccordion";

interface SubjectPageProps {
  params: Promise<{ subjectSlug: string }>;
}

export default async function SubjectPage({ params }: SubjectPageProps) {
  const { subjectSlug } = await params;
  const session = await auth();
  const userId = session?.user?.id;

  const subject = await db.subject.findUnique({
    where: { slug: subjectSlug },
    include: {
      modules: {
        include: {
          days: {
            include: {
              progress: userId ? { where: { userId } } : false,
            },
            orderBy: { dayNumber: "asc" },
          },
        },
        orderBy: { sortOrder: "asc" },
      },
      enrollments: userId ? { where: { userId } } : false,
    },
  });

  if (!subject) notFound();

  const isEnrolled =
    "enrollments" in subject &&
    Array.isArray(subject.enrollments) &&
    subject.enrollments.length > 0;

  const allDays = subject.modules.flatMap((m) => m.days);
  const totalDays = allDays.length;
  const completedDays = allDays.filter((d) => {
    const p = "progress" in d && Array.isArray(d.progress) && d.progress[0];
    return p && p.status === "COMPLETED";
  }).length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{subject.title}</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            {subject.description}
          </p>
          <div className="mt-3 flex items-center gap-4 text-sm text-muted-foreground">
            <span>{subject.modules.length} modules</span>
            <span>{totalDays} days</span>
            {isEnrolled && (
              <span className="font-medium text-primary">
                {completedDays}/{totalDays} completed
              </span>
            )}
          </div>
        </div>
        {!isEnrolled && userId && (
          <EnrollButton subjectId={subject.id} subjectSlug={subject.slug} />
        )}
      </div>

      {/* Progress bar if enrolled */}
      {isEnrolled && totalDays > 0 && (
        <div>
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Overall progress</span>
            <span className="font-medium">
              {Math.round((completedDays / totalDays) * 100)}%
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{
                width: `${Math.round((completedDays / totalDays) * 100)}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Modules */}
      <div className="space-y-3">
        {subject.modules.map((mod) => {
          const days = mod.days.map((day) => {
            const progress =
              "progress" in day && Array.isArray(day.progress)
                ? day.progress[0]
                : null;
            return {
              dayNumber: day.dayNumber,
              title: day.title,
              status: (progress?.status ?? "NOT_STARTED") as
                | "NOT_STARTED"
                | "IN_PROGRESS"
                | "COMPLETED",
            };
          });

          return (
            <ModuleAccordion
              key={mod.id}
              title={mod.title}
              weekStart={mod.weekStart}
              weekEnd={mod.weekEnd}
              days={days}
              subjectSlug={subjectSlug}
            />
          );
        })}
      </div>
    </div>
  );
}
