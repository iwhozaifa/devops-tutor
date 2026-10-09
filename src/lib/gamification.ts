import { db } from "@/lib/db";
import type { Badge, Streak, XpSource } from "@/generated/prisma/client";

// ─── XP Rules ─────────────────────────────────────────────

export function calculateLevel(totalXp: number): number {
  return Math.floor(Math.sqrt(totalXp / 100));
}

export function xpForLevel(level: number): number {
  return level * level * 100;
}

export function xpProgress(totalXp: number): {
  level: number;
  current: number;
  required: number;
  percentage: number;
} {
  const level = calculateLevel(totalXp);
  const currentLevelXp = xpForLevel(level);
  const nextLevelXp = xpForLevel(level + 1);
  const current = totalXp - currentLevelXp;
  const required = nextLevelXp - currentLevelXp;
  return {
    level,
    current,
    required,
    percentage: required > 0 ? Math.round((current / required) * 100) : 0,
  };
}

// ─── Data Fetchers ────────────────────────────────────────

export async function getTotalXp(userId: string): Promise<number> {
  const result = await db.xpLedger.aggregate({
    where: { userId },
    _sum: { amount: true },
  });
  return result._sum.amount ?? 0;
}

export async function getUserStreak(userId: string): Promise<Streak | null> {
  return db.streak.findUnique({ where: { userId } });
}

// ─── Badge Evaluation ─────────────────────────────────────

interface BadgeTrigger {
  type: string;
  value: number;
}

export async function evaluateBadges(userId: string): Promise<Badge[]> {
  // Get all badges the user has NOT yet earned
  const earnedBadgeIds = await db.userBadge.findMany({
    where: { userId },
    select: { badgeId: true },
  });
  const earnedSet = new Set(earnedBadgeIds.map((ub) => ub.badgeId));

  const allBadges = await db.badge.findMany();
  const unearnedBadges = allBadges.filter((b) => !earnedSet.has(b.id));

  if (unearnedBadges.length === 0) return [];

  // Gather user stats (only query what we need)
  const triggerTypes = new Set(
    unearnedBadges.map((b) => (b.trigger as unknown as BadgeTrigger).type)
  );

  const stats: Record<string, number> = {};

  if (triggerTypes.has("days_completed")) {
    stats.days_completed = await db.dayProgress.count({
      where: { userId, status: "COMPLETED" },
    });
  }

  if (triggerTypes.has("streak_days")) {
    const streak = await db.streak.findUnique({ where: { userId } });
    stats.streak_days = streak?.currentStreak ?? 0;
  }

  if (triggerTypes.has("quiz_perfect_score")) {
    stats.quiz_perfect_score = (
      await db.quizAttempt.findMany({
        where: { userId, score: 100 },
        select: { quizId: true },
        distinct: ["quizId"],
      })
    ).length;
  }

  if (triggerTypes.has("quizzes_passed")) {
    stats.quizzes_passed = (
      await db.quizAttempt.findMany({
        where: { userId, passed: true },
        select: { quizId: true },
        distinct: ["quizId"],
      })
    ).length;
  }

  if (triggerTypes.has("exams_passed")) {
    stats.exams_passed = (
      await db.examAttempt.findMany({
        where: { userId, passed: true },
        select: { examId: true },
        distinct: ["examId"],
      })
    ).length;
  }

  if (triggerTypes.has("projects_completed")) {
    stats.projects_completed = await db.projectProgress.count({
      where: { userId, status: "COMPLETED" },
    });
  }

  // Check each unearned badge
  const newlyEarned: Badge[] = [];

  for (const badge of unearnedBadges) {
    const trigger = badge.trigger as unknown as BadgeTrigger;
    const userValue = stats[trigger.type] ?? 0;

    if (userValue >= trigger.value) {
      // Award the badge — skipDuplicates makes concurrent evaluations safe
      const { count } = await db.userBadge.createMany({
        data: [{ userId, badgeId: badge.id }],
        skipDuplicates: true,
      });
      if (count === 0) continue;

      // Award badge XP if any
      if (badge.xpReward > 0) {
        await awardXp(
          userId,
          "BADGE_EARNED",
          badge.id,
          badge.xpReward,
          `Badge earned: ${badge.title}`
        );
      }

      newlyEarned.push(badge);
    }
  }

  return newlyEarned;
}

// ─── XP Award Functions ───────────────────────────────────

/**
 * Award XP at most once per (user, source, sourceId). Relies on the unique
 * index on XpLedger, so concurrent requests cannot double-award.
 * Returns the XP actually awarded (0 if it was already awarded).
 */
export async function awardXp(
  userId: string,
  source: XpSource,
  sourceId: string,
  amount: number,
  description: string
): Promise<number> {
  const { count } = await db.xpLedger.createMany({
    data: [{ userId, amount, source, sourceId, description }],
    skipDuplicates: true,
  });
  return count > 0 ? amount : 0;
}

export function awardQuizPassXp(
  userId: string,
  quizId: string,
  score: number,
  passingScore: number
): Promise<number> {
  const xp = 50 + Math.min(60, (score - passingScore) * 2);
  return awardXp(
    userId,
    "QUIZ_PASS",
    quizId,
    xp,
    `Quiz passed with score ${score}%`
  );
}

export function awardExamPassXp(
  userId: string,
  examId: string
): Promise<number> {
  return awardXp(userId, "EXAM_PASS", examId, 1000, "Exam passed");
}

// ─── Streaks ──────────────────────────────────────────────

function utcDay(date: Date): number {
  return Math.floor(date.getTime() / 86_400_000);
}

/** Pure streak transition, exported for testing. Days are UTC calendar days. */
export function nextStreak(
  prev: { currentStreak: number; longestStreak: number; lastActiveDate: Date | null } | null,
  now: Date
): { currentStreak: number; longestStreak: number } {
  if (!prev || !prev.lastActiveDate) {
    return { currentStreak: 1, longestStreak: Math.max(1, prev?.longestStreak ?? 0) };
  }
  const gap = utcDay(now) - utcDay(prev.lastActiveDate);
  if (gap <= 0) {
    return { currentStreak: prev.currentStreak, longestStreak: prev.longestStreak };
  }
  const currentStreak = gap === 1 ? prev.currentStreak + 1 : 1;
  return { currentStreak, longestStreak: Math.max(prev.longestStreak, currentStreak) };
}

/** Record activity for today; increments at most once per UTC day. */
export async function recordStreakActivity(userId: string): Promise<void> {
  const now = new Date();
  const today = new Date(utcDay(now) * 86_400_000);

  await db.$transaction(async (tx) => {
    const prev = await tx.streak.findUnique({ where: { userId } });
    const next = nextStreak(prev, now);
    await tx.streak.upsert({
      where: { userId },
      update: { ...next, lastActiveDate: today },
      create: { userId, ...next, lastActiveDate: today },
    });
  });
}

// ─── Event Processor ──────────────────────────────────────

export async function processGamificationEvent(userId: string): Promise<{
  totalXp: number;
  level: number;
  streak: { current: number; longest: number };
  newBadges: Badge[];
}> {
  const [totalXp, streakRecord, newBadges] = await Promise.all([
    getTotalXp(userId),
    getUserStreak(userId),
    evaluateBadges(userId),
  ]);

  // Re-fetch total XP since badges may have awarded extra XP
  const finalXp =
    newBadges.length > 0 ? await getTotalXp(userId) : totalXp;

  const level = calculateLevel(finalXp);

  return {
    totalXp: finalXp,
    level,
    streak: {
      current: streakRecord?.currentStreak ?? 0,
      longest: streakRecord?.longestStreak ?? 0,
    },
    newBadges,
  };
}
