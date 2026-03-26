import Link from "next/link";
import { BookOpen } from "lucide-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { EnrollButton } from "@/components/EnrollButton";

export default async function SubjectsPage() {
  const session = await auth();
  const userId = session?.user?.id;

  const subjects = await db.subject.findMany({
    where: { isPublished: true },
    include: {
      modules: {
        include: {
          _count: { select: { days: true } },
        },
      },
      enrollments: userId ? { where: { userId } } : false,
    },
    orderBy: { sortOrder: "asc" },
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Subjects</h1>
        <p className="mt-1 text-muted-foreground">
          Explore all available DevOps subjects and enroll to start learning.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {subjects.map((subject) => {
          const moduleCount = subject.modules.length;
          const dayCount = subject.modules.reduce(
            (acc, m) => acc + m._count.days,
            0
          );
          const enrollment =
            "enrollments" in subject &&
            Array.isArray(subject.enrollments) &&
            subject.enrollments[0];

          return (
            <div
              key={subject.id}
              className="flex flex-col rounded-lg border bg-card p-5"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <BookOpen className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold">{subject.title}</h3>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                    {subject.description}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
                <span>{moduleCount} modules</span>
                <span>{dayCount} days</span>
              </div>

              <div className="mt-4 flex items-center gap-2">
                {enrollment ? (
                  <Button size="sm" asChild>
                    <Link href={`/subjects/${subject.slug}`}>
                      Continue Learning
                    </Link>
                  </Button>
                ) : userId ? (
                  <EnrollButton
                    subjectId={subject.id}
                    subjectSlug={subject.slug}
                  />
                ) : (
                  <Button size="sm" asChild>
                    <Link href={`/subjects/${subject.slug}`}>View</Link>
                  </Button>
                )}
              </div>
            </div>
          );
        })}

        {subjects.length === 0 && (
          <div className="col-span-full rounded-lg border bg-card p-8 text-center text-muted-foreground">
            No subjects available yet. Check back soon!
          </div>
        )}
      </div>
    </div>
  );
}
