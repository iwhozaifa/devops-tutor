import { db } from "@/lib/db";

export default async function AdminAnalyticsPage() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [
    dailyCompletions,
    quizAttempts,
    examAttempts,
    topUserXp,
    subjectEnrollments,
    moduleCompletionData,
  ] = await Promise.all([
    // Daily active users (last 30 days) - users who completed a day
    db.dayProgress.findMany({
      where: {
        status: "COMPLETED",
        completedAt: { gte: thirtyDaysAgo },
      },
      select: {
        userId: true,
        completedAt: true,
      },
    }),
    // Quiz stats
    db.quizAttempt.aggregate({
      _count: { id: true },
      _avg: { score: true },
    }),
    // Exam stats
    db.examAttempt.aggregate({
      _count: { id: true },
      _avg: { score: true },
    }),
    // Top 10 users by XP
    db.xpLedger.groupBy({
      by: ["userId"],
      _sum: { amount: true },
      orderBy: { _sum: { amount: "desc" } },
      take: 10,
    }),
    // Subject enrollments
    db.enrollment.groupBy({
      by: ["subjectId"],
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
    }),
    // Module completion - days completed vs total days per module
    db.module.findMany({
      select: {
        id: true,
        title: true,
        subject: { select: { title: true } },
        days: {
          select: {
            id: true,
            _count: {
              select: {
                progress: { where: { status: "COMPLETED" } },
              },
            },
          },
        },
      },
    }),
  ]);

  // Quiz pass rate
  const quizPassed = await db.quizAttempt.count({ where: { passed: true } });
  const quizTotal = quizAttempts._count.id;
  const quizPassRate = quizTotal > 0 ? ((quizPassed / quizTotal) * 100).toFixed(1) : "N/A";

  // Exam pass rate
  const examPassed = await db.examAttempt.count({ where: { passed: true } });
  const examTotal = examAttempts._count.id;
  const examPassRate = examTotal > 0 ? ((examPassed / examTotal) * 100).toFixed(1) : "N/A";

  // Build daily active user counts
  const dauMap = new Map<string, Set<string>>();
  for (const dp of dailyCompletions) {
    if (!dp.completedAt) continue;
    const dateKey = dp.completedAt.toISOString().slice(0, 10);
    if (!dauMap.has(dateKey)) dauMap.set(dateKey, new Set());
    dauMap.get(dateKey)!.add(dp.userId);
  }

  const dauEntries: { date: string; count: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    dauEntries.push({ date: key, count: dauMap.get(key)?.size ?? 0 });
  }

  // Get user names for top XP
  const topUserIds = topUserXp.map((u) => u.userId);
  const topUsers = await db.user.findMany({
    where: { id: { in: topUserIds } },
    select: { id: true, name: true, email: true },
  });
  const userMap = new Map(topUsers.map((u) => [u.id, u]));

  // Get subject names
  const subjectIds = subjectEnrollments.map((s) => s.subjectId);
  const subjects = await db.subject.findMany({
    where: { id: { in: subjectIds } },
    select: { id: true, title: true },
  });
  const subjectMap = new Map(subjects.map((s) => [s.id, s.title]));

  // Average completion rate per module
  const totalEnrollmentCount = await db.enrollment.count();
  const moduleCompletion = moduleCompletionData.map((mod) => {
    const totalDays = mod.days.length;
    if (totalDays === 0 || totalEnrollmentCount === 0) {
      return { title: mod.title, subject: mod.subject.title, rate: "N/A" };
    }
    const completedDayInstances = mod.days.reduce(
      (sum, day) => sum + day._count.progress,
      0
    );
    const possibleCompletions = totalDays * totalEnrollmentCount;
    const rate = ((completedDayInstances / possibleCompletions) * 100).toFixed(1);
    return { title: mod.title, subject: mod.subject.title, rate: `${rate}%` };
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="mt-1 text-muted-foreground">
          Platform performance and engagement metrics.
        </p>
      </div>

      {/* Pass rates */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border bg-card p-5">
          <p className="text-sm text-muted-foreground">Quiz Pass Rate</p>
          <p className="mt-1 text-2xl font-bold">
            {quizPassRate}{quizPassRate !== "N/A" && "%"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {quizPassed} / {quizTotal} attempts
          </p>
        </div>
        <div className="rounded-lg border bg-card p-5">
          <p className="text-sm text-muted-foreground">Exam Pass Rate</p>
          <p className="mt-1 text-2xl font-bold">
            {examPassRate}{examPassRate !== "N/A" && "%"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {examPassed} / {examTotal} attempts
          </p>
        </div>
        <div className="rounded-lg border bg-card p-5">
          <p className="text-sm text-muted-foreground">Avg Quiz Score</p>
          <p className="mt-1 text-2xl font-bold">
            {quizAttempts._avg.score !== null
              ? `${quizAttempts._avg.score.toFixed(1)}%`
              : "N/A"}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-5">
          <p className="text-sm text-muted-foreground">Avg Exam Score</p>
          <p className="mt-1 text-2xl font-bold">
            {examAttempts._avg.score !== null
              ? `${examAttempts._avg.score.toFixed(1)}%`
              : "N/A"}
          </p>
        </div>
      </div>

      {/* Daily active users */}
      <div className="rounded-lg border bg-card p-5">
        <h2 className="mb-4 text-lg font-semibold">
          Daily Active Users (Last 30 Days)
        </h2>
        <div className="grid grid-cols-5 gap-2 sm:grid-cols-6 md:grid-cols-10">
          {dauEntries.map((entry) => (
            <div
              key={entry.date}
              className="rounded-md border bg-muted/30 p-2 text-center"
            >
              <p className="text-[10px] text-muted-foreground">
                {entry.date.slice(5)}
              </p>
              <p className="text-sm font-bold">{entry.count}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top 10 users by XP */}
        <div className="rounded-lg border bg-card p-5">
          <h2 className="mb-4 text-lg font-semibold">Top 10 Users by XP</h2>
          {topUserXp.length === 0 ? (
            <p className="text-sm text-muted-foreground">No XP data yet.</p>
          ) : (
            <div className="space-y-3">
              {topUserXp.map((entry, i) => {
                const user = userMap.get(entry.userId);
                return (
                  <div
                    key={entry.userId}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                        {i + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {user?.name ?? "Unnamed"}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {user?.email}
                        </p>
                      </div>
                    </div>
                    <span className="shrink-0 font-semibold">
                      {(entry._sum.amount ?? 0).toLocaleString()} XP
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Most popular subjects */}
        <div className="rounded-lg border bg-card p-5">
          <h2 className="mb-4 text-lg font-semibold">
            Most Popular Subjects
          </h2>
          {subjectEnrollments.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No enrollments yet.
            </p>
          ) : (
            <div className="space-y-3">
              {subjectEnrollments.map((stat) => (
                <div
                  key={stat.subjectId}
                  className="flex items-center justify-between"
                >
                  <span className="text-sm font-medium">
                    {subjectMap.get(stat.subjectId) ?? "Unknown"}
                  </span>
                  <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-sm font-semibold text-primary">
                    {stat._count.id} enrolled
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Module completion rates */}
      <div className="rounded-lg border bg-card p-5">
        <h2 className="mb-4 text-lg font-semibold">
          Average Completion Rate per Module
        </h2>
        {moduleCompletion.length === 0 ? (
          <p className="text-sm text-muted-foreground">No module data.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="px-3 py-2 text-left font-medium">Module</th>
                  <th className="px-3 py-2 text-left font-medium">Subject</th>
                  <th className="px-3 py-2 text-right font-medium">
                    Completion Rate
                  </th>
                </tr>
              </thead>
              <tbody>
                {moduleCompletion.map((mod, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="px-3 py-2">{mod.title}</td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {mod.subject}
                    </td>
                    <td className="px-3 py-2 text-right font-medium">
                      {mod.rate}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
