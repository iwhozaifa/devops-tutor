import type { PrismaClient } from "@/generated/prisma/client";
import { db } from "./db";

// Fixed-window counters in Postgres, shared by every app instance. One
// atomic upsert per call: it starts a new window when the old one has ended,
// otherwise increments, and returns the count after this request.
export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
  client: PrismaClient = db
): Promise<boolean> {
  // The clock comes from the app (not now() in SQL) so windows are testable
  const now = new Date();
  const resetAt = new Date(now.getTime() + windowMs);

  const [row] = await client.$queryRaw<{ count: number }[]>`
    INSERT INTO "RateLimitBucket" ("key", "count", "resetAt")
    VALUES (${key}, 1, ${resetAt})
    ON CONFLICT ("key") DO UPDATE SET
      "count"   = CASE WHEN "RateLimitBucket"."resetAt" <= ${now} THEN 1
                       ELSE "RateLimitBucket"."count" + 1 END,
      "resetAt" = CASE WHEN "RateLimitBucket"."resetAt" <= ${now} THEN EXCLUDED."resetAt"
                       ELSE "RateLimitBucket"."resetAt" END
    RETURNING "count"`;

  // Occasionally clear out finished windows so the table stays small
  if (Math.random() < 0.01) void pruneRateLimits(client).catch(() => {});

  return row.count <= limit;
}

/** Deletes buckets whose window has ended; returns how many were removed. */
export async function pruneRateLimits(client: PrismaClient = db): Promise<number> {
  return client.$executeRaw`DELETE FROM "RateLimitBucket" WHERE "resetAt" <= ${new Date()}`;
}
