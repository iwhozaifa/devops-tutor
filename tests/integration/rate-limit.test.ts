import { afterEach, describe, expect, it, vi } from "vitest";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { pruneRateLimits, rateLimit } from "@/lib/rate-limit";

afterEach(() => {
  vi.useRealTimers();
});

describe("rateLimit (Postgres-backed)", () => {
  it("allows up to the limit, then blocks until the window resets", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    for (let i = 0; i < 3; i++) expect(await rateLimit("k:window", 3, 60_000)).toBe(true);
    expect(await rateLimit("k:window", 3, 60_000)).toBe(false);

    vi.setSystemTime(new Date("2026-01-01T00:00:59Z"));
    expect(await rateLimit("k:window", 3, 60_000)).toBe(false);

    vi.setSystemTime(new Date("2026-01-01T00:01:00.001Z"));
    expect(await rateLimit("k:window", 3, 60_000)).toBe(true);
  });

  it("keeps separate counts per key", async () => {
    expect(await rateLimit("k:a", 1, 60_000)).toBe(true);
    expect(await rateLimit("k:a", 1, 60_000)).toBe(false);
    expect(await rateLimit("k:b", 1, 60_000)).toBe(true);
  });

  it("is atomic under concurrency: exactly `limit` of 20 parallel calls pass", async () => {
    const results = await Promise.all(Array.from({ length: 20 }, () => rateLimit("k:race", 10, 60_000)));
    expect(results.filter(Boolean)).toHaveLength(10);
    const bucket = await db.rateLimitBucket.findUniqueOrThrow({ where: { key: "k:race" } });
    expect(bucket.count).toBe(20);
  });

  it("is shared between app instances (separate connection pools)", async () => {
    const other = new PrismaClient({
      adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL, max: 1 }),
    });
    try {
      expect(await rateLimit("k:shared", 2, 60_000)).toBe(true);
      expect(await rateLimit("k:shared", 2, 60_000, other)).toBe(true);
      expect(await rateLimit("k:shared", 2, 60_000, other)).toBe(false);
      expect(await rateLimit("k:shared", 2, 60_000)).toBe(false);
      // The count lives in Postgres, where every instance sees it
      const bucket = await other.rateLimitBucket.findUniqueOrThrow({ where: { key: "k:shared" } });
      expect(bucket.count).toBe(4);
    } finally {
      await other.$disconnect();
    }
  });

  it("prunes buckets whose window ended", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    await rateLimit("k:old", 5, 1_000);
    await rateLimit("k:live", 5, 3_600_000);

    vi.setSystemTime(new Date("2026-01-01T00:10:00Z"));
    expect(await pruneRateLimits()).toBe(1);
    const keys = (await db.rateLimitBucket.findMany()).map((b) => b.key);
    expect(keys).toEqual(["k:live"]);
  });
});
