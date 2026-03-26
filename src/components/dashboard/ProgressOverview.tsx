import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DayWithProgress {
  id: string;
  dayNumber: number;
  progress: { status: string }[];
}

interface ModuleWithDays {
  days: DayWithProgress[];
}

interface EnrollmentWithSubject {
  subject: {
    slug: string;
    title: string;
    description: string;
    modules: ModuleWithDays[];
  };
}

interface ProgressOverviewProps {
  enrollments: EnrollmentWithSubject[];
}

export function ProgressOverview({ enrollments }: ProgressOverviewProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Your Subjects</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {enrollments.map((enrollment) => {
          const allDays = enrollment.subject.modules.flatMap((m) => m.days);
          const completedDays = allDays.filter(
            (d) => d.progress[0]?.status === "COMPLETED"
          ).length;
          const totalDays = allDays.length;
          const pct = totalDays > 0 ? Math.round((completedDays / totalDays) * 100) : 0;

          return (
            <div
              key={enrollment.subject.slug}
              className="rounded-lg border bg-card p-5"
            >
              <h3 className="font-semibold">{enrollment.subject.title}</h3>
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                {enrollment.subject.description}
              </p>

              {/* Progress bar */}
              <div className="mt-4">
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    {completedDays} / {totalDays} days
                  </span>
                  <span className="font-medium">{pct}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>

              <Button variant="ghost" size="sm" className="mt-3 -ml-2" asChild>
                <Link href={`/subjects/${enrollment.subject.slug}`}>
                  View Subject
                  <ArrowRight className="ml-1 h-3 w-3" />
                </Link>
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
