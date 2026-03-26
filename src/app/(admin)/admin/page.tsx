import { db } from "@/lib/db";
import { Users, BookOpen, Activity, TrendingUp } from "lucide-react";

export default async function AdminDashboardPage() {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const [
    totalUsers,
    totalEnrollments,
    activeUsers,
    subjectStats,
    recentSignups,
  ] = await Promise.all([
    db.user.count(),
    db.enrollment.count(),
    db.dayProgress.findMany({
      where: {
        status: "COMPLETED",
        completedAt: { gte: sevenDaysAgo },
      },
      select: { userId: true },
      distinct: ["userId"],
    }),
    db.enrollment.groupBy({
      by: ["subjectId"],
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
    }),
    db.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
      },
    }),
  ]);

  // Get subject titles for stats
  const subjectIds = subjectStats.map((s) => s.subjectId);
  const subjects = await db.subject.findMany({
    where: { id: { in: subjectIds } },
    select: { id: true, title: true },
  });
  const subjectMap = new Map(subjects.map((s) => [s.id, s.title]));

  const stats = [
    {
      label: "Total Users",
      value: totalUsers,
      icon: Users,
      color: "text-blue-600 bg-blue-500/10",
    },
    {
      label: "Total Enrollments",
      value: totalEnrollments,
      icon: BookOpen,
      color: "text-green-600 bg-green-500/10",
    },
    {
      label: "Active Users (7d)",
      value: activeUsers.length,
      icon: Activity,
      color: "text-orange-600 bg-orange-500/10",
    },
    {
      label: "Subjects",
      value: subjectStats.length,
      icon: TrendingUp,
      color: "text-purple-600 bg-purple-500/10",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <p className="mt-1 text-muted-foreground">
          Overview of your DevOps Tutor platform.
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="flex items-center gap-4 rounded-lg border bg-card p-5"
          >
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-lg ${stat.color}`}
            >
              <stat.icon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Subject stats */}
        <div className="rounded-lg border bg-card p-5">
          <h2 className="mb-4 text-lg font-semibold">
            Enrollments per Subject
          </h2>
          {subjectStats.length === 0 ? (
            <p className="text-sm text-muted-foreground">No enrollments yet.</p>
          ) : (
            <div className="space-y-3">
              {subjectStats.map((stat) => (
                <div
                  key={stat.subjectId}
                  className="flex items-center justify-between"
                >
                  <span className="text-sm font-medium">
                    {subjectMap.get(stat.subjectId) ?? "Unknown"}
                  </span>
                  <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-sm font-semibold text-primary">
                    {stat._count.id}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent signups */}
        <div className="rounded-lg border bg-card p-5">
          <h2 className="mb-4 text-lg font-semibold">Recent Signups</h2>
          {recentSignups.length === 0 ? (
            <p className="text-sm text-muted-foreground">No users yet.</p>
          ) : (
            <div className="space-y-3">
              {recentSignups.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {user.name ?? "Unnamed"}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {user.createdAt.toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
