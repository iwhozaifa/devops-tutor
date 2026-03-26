import Link from "next/link";
import { redirect } from "next/navigation";
import { Flame, ArrowRight } from "lucide-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { ProgressOverview } from "@/components/dashboard/ProgressOverview";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const userId = session.user.id;

  const [streak, enrollments] = await Promise.all([
    db.streak.findUnique({ where: { userId } }),
    db.enrollment.findMany({
      where: { userId, status: "ACTIVE" },
      include: {
        subject: {
          include: {
            modules: {
              include: {
                days: {
                  include: {
                    progress: { where: { userId } },
                  },
                  orderBy: { dayNumber: "asc" },
                },
              },
              orderBy: { sortOrder: "asc" },
            },
          },
        },
      },
    }),
  ]);

  // Find the next incomplete day across all enrollments
  let nextDayLink: string | null = null;
  for (const enrollment of enrollments) {
    for (const mod of enrollment.subject.modules) {
      for (const day of mod.days) {
        const progress = day.progress[0];
        if (!progress || progress.status !== "COMPLETED") {
          nextDayLink = `/subjects/${enrollment.subject.slug}/curriculum/${day.dayNumber}`;
          break;
        }
      }
      if (nextDayLink) break;
    }
    if (nextDayLink) break;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">
          Welcome back, {session.user.name ?? "Learner"}
        </h1>
        <p className="mt-1 text-muted-foreground">
          Here&apos;s your learning overview.
        </p>
      </div>

      {/* Streak + Continue */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex items-center gap-4 rounded-lg border bg-card p-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-orange-500/10">
            <Flame className="h-6 w-6 text-orange-500" />
          </div>
          <div>
            <p className="text-2xl font-bold">{streak?.currentStreak ?? 0}</p>
            <p className="text-sm text-muted-foreground">Day streak</p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-sm font-medium">
              {streak?.longestStreak ?? 0} best
            </p>
          </div>
        </div>

        {nextDayLink && (
          <div className="flex items-center justify-between rounded-lg border bg-card p-5">
            <div>
              <p className="font-medium">Continue Learning</p>
              <p className="text-sm text-muted-foreground">
                Pick up where you left off
              </p>
            </div>
            <Button size="sm" asChild>
              <Link href={nextDayLink}>
                Continue
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
        )}
      </div>

      {/* Enrolled Subjects Progress */}
      {enrollments.length > 0 ? (
        <ProgressOverview enrollments={enrollments} />
      ) : (
        <div className="rounded-lg border bg-card p-8 text-center">
          <p className="text-muted-foreground">
            You haven&apos;t enrolled in any subjects yet.
          </p>
          <Button className="mt-4" asChild>
            <Link href="/subjects">Browse Subjects</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
