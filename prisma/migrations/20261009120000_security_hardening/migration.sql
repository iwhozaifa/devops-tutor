-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "role" "Role" NOT NULL DEFAULT 'USER';

-- Remove duplicate XP awards (keep the earliest) so the unique index can be created
DELETE FROM "XpLedger" a
USING "XpLedger" b
WHERE a."userId" = b."userId"
  AND a."source" = b."source"
  AND a."sourceId" = b."sourceId"
  AND (a."createdAt", a."id") > (b."createdAt", b."id");

-- CreateIndex
CREATE UNIQUE INDEX "XpLedger_userId_source_sourceId_key" ON "XpLedger"("userId", "source", "sourceId");
