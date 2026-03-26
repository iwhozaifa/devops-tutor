import { redirect } from "next/navigation";
import {
  User,
  Mail,
  CalendarDays,
  Zap,
  Trophy,
  Flame,
  CheckCircle,
  Clock,
  Timer,
  Award,
} from "lucide-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { xpProgress } from "@/lib/gamification";
import { XpBar } from "@/components/gamification/XpBar";
import { BadgeDisplay } from "@/components/gamification/BadgeDisplay";
import { StreakCounter } from "@/components/gamification/StreakCounter";

export default async function ProfilePage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const userId = session.user.id;

  const [
    user,
    xpEntries,
    streak,
    dayProgressCount,
    quizAttempts,
    examAttempts,
    allBadges,
    userBadges,
  ] = await Promise.all([
    db.user.findUnique({ where: { id: userId } }),
    db.xpLedger.aggregate({
      where: { userId },
      _sum: { amount: true },
    }),
    db.streak.findUnique({ where: { userId } }),
    db.dayProgress.count({
      where: { userId, status: "COMPLETED" },
    }),
    db.quizAttempt.findMany({
      where: { userId },
      orderBy: { completedAt: "desc" },
      take: 10,
      include: { quiz: { select: { title: true } } },
    }),
    db.examAttempt.findMany({
      where: { userId },
      orderBy: { completedAt: "desc" },
      take: 10,
      include: { exam: { select: { title: true } } },
    }),
    db.badge.findMany(),
    db.userBadge.findMany({
      where: { userId },
      select: { badgeId: true, earnedAt: true },
    }),
  ]);

  if (!user) redirect("/login");

  const totalXp = xpEntries._sum.amount ?? 0;
  const progress = xpProgress(totalXp);
  const currentStreak = streak?.currentStreak ?? 0;

  const earnedMap = new Map(
    userBadges.map((ub) => [ub.badgeId, ub.earnedAt])
  );
  const badgesForDisplay = allBadges.map((b) => ({
    id: b.id,
    slug: b.slug,
    title: b.title,
    description: b.description,
    icon: b.icon,
    category: b.category,
    earned: earnedMap.has(b.id),
    earnedAt: earnedMap.get(b.id)?.toISOString() ?? null,
  }));

  function formatTime(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  }

  return (
    <div className="space-y-8">
      {/* User Info */}
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-4">
          {user.image ? (
            <img
              src={user.image}
              alt=""
              className="h-16 w-16 rounded-full"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <User className="h-8 w-8 text-primary" />
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold">
              {user.name ?? "Student"}
            </h1>
            <p className="flex items-center gap-1 text-sm text-muted-foreground">
              <Mail className="h-4 w-4" />
              {user.email}
            </p>
            <p className="flex items-center gap-1 text-sm text-muted-foreground">
              <CalendarDays className="h-4 w-4" />
              Joined {new Date(user.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Zap className="h-4 w-4" />
            <span className="text-xs font-medium">Total XP</span>
          </div>
          <p className="mt-2 text-2xl font-bold">{totalXp.toLocaleString()}</p>
        </div>
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Trophy className="h-4 w-4" />
            <span className="text-xs font-medium">Level</span>
          </div>
          <p className="mt-2 text-2xl font-bold">{progress.level}</p>
        </div>
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Flame className="h-4 w-4" />
            <span className="text-xs font-medium">Streak</span>
          </div>
          <p className="mt-2 text-2xl font-bold">
            {currentStreak} day{currentStreak !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <CheckCircle className="h-4 w-4" />
            <span className="text-xs font-medium">Days Done</span>
          </div>
          <p className="mt-2 text-2xl font-bold">{dayProgressCount}</p>
        </div>
      </div>

      {/* XP Progress */}
      <section className="rounded-lg border bg-card p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold">Level Progress</h2>
        <XpBar
          level={progress.level}
          current={progress.current}
          required={progress.required}
          percentage={progress.percentage}
          totalXp={totalXp}
        />
      </section>

      {/* Streak */}
      <section className="rounded-lg border bg-card p-6 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold">Streak</h2>
        <div className="flex items-center gap-6">
          <StreakCounter currentStreak={currentStreak} />
          <div className="text-sm text-muted-foreground">
            Longest streak:{" "}
            <span className="font-semibold text-foreground">
              {streak?.longestStreak ?? 0} days
            </span>
          </div>
        </div>
      </section>

      {/* Badge Collection */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Award className="h-5 w-5 text-yellow-500" />
          <h2 className="text-lg font-semibold">Badge Collection</h2>
          <span className="text-sm text-muted-foreground">
            ({userBadges.length}/{allBadges.length} earned)
          </span>
        </div>
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          {allBadges.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No badges available yet.
            </p>
          ) : (
            <BadgeDisplay badges={badgesForDisplay} />
          )}
        </div>
      </section>

      {/* Quiz Attempts */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Recent Quiz Attempts</h2>
        {quizAttempts.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No quiz attempts yet.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border bg-card shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Quiz
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Score
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Result
                  </th>
                </tr>
              </thead>
              <tbody>
                {quizAttempts.map((attempt) => (
                  <tr key={attempt.id} className="border-b last:border-0">
                    <td className="px-4 py-3 text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(attempt.completedAt).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {attempt.quiz.title}
                    </td>
                    <td className="px-4 py-3">{attempt.score}%</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          attempt.passed
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {attempt.passed ? "Passed" : "Failed"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Exam Attempts */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Recent Exam Attempts</h2>
        {examAttempts.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No exam attempts yet.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border bg-card shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Exam
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Score
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Time
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Result
                  </th>
                </tr>
              </thead>
              <tbody>
                {examAttempts.map((attempt) => (
                  <tr key={attempt.id} className="border-b last:border-0">
                    <td className="px-4 py-3 text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(attempt.completedAt).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {attempt.exam.title}
                    </td>
                    <td className="px-4 py-3">{attempt.score}%</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Timer className="h-3 w-3" />
                        {formatTime(attempt.timeSpent)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          attempt.passed
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {attempt.passed ? "Passed" : "Failed"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
