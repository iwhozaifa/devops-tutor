import { db } from "@/lib/db";
import type { Badge, Streak } from "@/generated/prisma/client";

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
    stats.quiz_perfect_score = await db.quizAttempt.count({
      where: { userId, score: 100 },
    });
  }

  if (triggerTypes.has("quizzes_passed")) {
    stats.quizzes_passed = await db.quizAttempt.count({
      where: { userId, passed: true },
    });
  }

  if (triggerTypes.has("exams_passed")) {
    stats.exams_passed = await db.examAttempt.count({
      where: { userId, passed: true },
    });
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
      // Award the badge
      await db.userBadge.create({
        data: { userId, badgeId: badge.id },
      });

      // Award badge XP if any
      if (badge.xpReward > 0) {
        await db.xpLedger.create({
          data: {
            userId,
            amount: badge.xpReward,
            source: "BADGE_EARNED",
            sourceId: badge.id,
            description: `Badge earned: ${badge.title}`,
          },
        });
      }

      newlyEarned.push(badge);
    }
  }

  return newlyEarned;
}

// ─── XP Award Functions ───────────────────────────────────

export async function awardQuizPassXp(
  userId: string,
  quizId: string,
  score: number,
  passingScore: number
): Promise<number> {
  const xp = 50 + Math.min(60, (score - passingScore) * 2);

  await db.xpLedger.create({
    data: {
      userId,
      amount: xp,
      source: "QUIZ_PASS",
      sourceId: quizId,
      description: `Quiz passed with score ${score}%`,
    },
  });

  return xp;
}

export async function awardExamPassXp(
  userId: string,
  examId: string
): Promise<number> {
  const xp = 1000;

  await db.xpLedger.create({
    data: {
      userId,
      amount: xp,
      source: "EXAM_PASS",
      sourceId: examId,
      description: "Exam passed",
    },
  });

  return xp;
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
