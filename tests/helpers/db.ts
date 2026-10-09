import { db } from "@/lib/db";

// Every table except Prisma's migration history. Listed explicitly (rather
// than read from the catalog) so a new table is a conscious addition here.
const TABLES = [
  "AdminAuditLog",
  "EmailToken",
  "RateLimitBucket",
  "XpLedger",
  "UserBadge",
  "Badge",
  "Streak",
  "ProjectProgress",
  "TaskSubmission",
  "ExamAttempt",
  "QuizAttempt",
  "DayProgress",
  "Enrollment",
  "Account",
  "Session",
  "VerificationToken",
  "User",
  "Project",
  "DailyTask",
  "ExamQuestion",
  "Exam",
  "Certification",
  "QuizQuestion",
  "Quiz",
  "Resource",
  "Day",
  "Module",
  "Subject",
];

export async function resetDatabase() {
  await db.$executeRawUnsafe(
    `TRUNCATE TABLE ${TABLES.map((t) => `"${t}"`).join(", ")} RESTART IDENTITY CASCADE`
  );
}
