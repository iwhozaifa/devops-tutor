import { describe, expect, it } from "vitest";
import { calculateLevel, nextStreak, xpProgress } from "./gamification";

const day = (iso: string) => new Date(`${iso}T12:00:00Z`);

describe("nextStreak", () => {
  it("starts a streak for a new user", () => {
    expect(nextStreak(null, day("2026-10-09"))).toEqual({
      currentStreak: 1,
      longestStreak: 1,
    });
  });

  it("does not increment twice on the same day", () => {
    const prev = { currentStreak: 3, longestStreak: 5, lastActiveDate: day("2026-10-09") };
    expect(nextStreak(prev, day("2026-10-09"))).toEqual({
      currentStreak: 3,
      longestStreak: 5,
    });
  });

  it("increments on consecutive days and tracks the longest streak", () => {
    const prev = { currentStreak: 5, longestStreak: 5, lastActiveDate: day("2026-10-08") };
    expect(nextStreak(prev, day("2026-10-09"))).toEqual({
      currentStreak: 6,
      longestStreak: 6,
    });
  });

  it("resets after a missed day but keeps the longest streak", () => {
    const prev = { currentStreak: 4, longestStreak: 9, lastActiveDate: day("2026-10-06") };
    expect(nextStreak(prev, day("2026-10-09"))).toEqual({
      currentStreak: 1,
      longestStreak: 9,
    });
  });

  it("uses UTC calendar days", () => {
    const prev = {
      currentStreak: 1,
      longestStreak: 1,
      lastActiveDate: new Date("2026-10-08T23:59:00Z"),
    };
    expect(nextStreak(prev, new Date("2026-10-09T00:01:00Z")).currentStreak).toBe(2);
  });
});

describe("levels", () => {
  it("computes level thresholds", () => {
    expect(calculateLevel(0)).toBe(0);
    expect(calculateLevel(99)).toBe(0);
    expect(calculateLevel(100)).toBe(1);
    expect(calculateLevel(400)).toBe(2);
  });

  it("reports progress within a level", () => {
    expect(xpProgress(250)).toEqual({ level: 1, current: 150, required: 300, percentage: 50 });
  });
});
