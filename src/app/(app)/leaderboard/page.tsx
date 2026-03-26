import { redirect } from "next/navigation";
import { Trophy, Award } from "lucide-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { calculateLevel } from "@/lib/gamification";
import { cn } from "@/lib/utils";

export default async function LeaderboardPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const currentUserId = session.user.id;

  // Aggregate total XP per user, top 20
  const xpByUser = await db.xpLedger.groupBy({
    by: ["userId"],
    _sum: { amount: true },
    orderBy: { _sum: { amount: "desc" } },
    take: 20,
  });

  const userIds = xpByUser.map((entry) => entry.userId);

  // Fetch user details and badge counts in parallel
  const [users, badgeCounts] = await Promise.all([
    db.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, image: true },
    }),
    db.userBadge.groupBy({
      by: ["userId"],
      where: { userId: { in: userIds } },
      _count: { id: true },
    }),
  ]);

  const userMap = new Map(users.map((u) => [u.id, u]));
  const badgeMap = new Map(
    badgeCounts.map((b) => [b.userId, b._count.id])
  );

  const leaderboard = xpByUser.map((entry, index) => {
    const user = userMap.get(entry.userId);
    const totalXp = entry._sum.amount ?? 0;
    return {
      rank: index + 1,
      userId: entry.userId,
      name: user?.name ?? "Anonymous",
      image: user?.image,
      totalXp,
      level: calculateLevel(totalXp),
      badgeCount: badgeMap.get(entry.userId) ?? 0,
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Trophy className="h-6 w-6 text-yellow-500" />
        <h1 className="text-2xl font-bold">Leaderboard</h1>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="w-16 px-4 py-3 text-center font-medium text-muted-foreground">
                Rank
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Student
              </th>
              <th className="px-4 py-3 text-center font-medium text-muted-foreground">
                Level
              </th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                Total XP
              </th>
              <th className="px-4 py-3 text-center font-medium text-muted-foreground">
                Badges
              </th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.map((entry) => {
              const isCurrentUser = entry.userId === currentUserId;
              return (
                <tr
                  key={entry.userId}
                  className={cn(
                    "border-b last:border-0 transition-colors",
                    isCurrentUser && "bg-yellow-500/5"
                  )}
                >
                  <td className="px-4 py-3 text-center">
                    {entry.rank <= 3 ? (
                      <span
                        className={cn(
                          "inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold",
                          entry.rank === 1 &&
                            "bg-yellow-500/20 text-yellow-500",
                          entry.rank === 2 &&
                            "bg-gray-400/20 text-gray-400",
                          entry.rank === 3 &&
                            "bg-amber-700/20 text-amber-700"
                        )}
                      >
                        {entry.rank}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">
                        {entry.rank}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {entry.image ? (
                        <img
                          src={entry.image}
                          alt=""
                          className="h-8 w-8 rounded-full"
                        />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                          {entry.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span
                        className={cn(
                          "font-medium",
                          isCurrentUser && "text-yellow-500"
                        )}
                      >
                        {entry.name}
                        {isCurrentUser && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            (you)
                          </span>
                        )}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center font-semibold">
                    {entry.level}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-sm">
                    {entry.totalXp.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center gap-1 text-muted-foreground">
                      <Award className="h-3 w-3" />
                      {entry.badgeCount}
                    </span>
                  </td>
                </tr>
              );
            })}
            {leaderboard.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-8 text-center text-muted-foreground"
                >
                  No XP earned yet. Start learning to climb the ranks!
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
