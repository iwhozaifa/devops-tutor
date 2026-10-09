import { describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({ headers: vi.fn() }));
const { rateLimit } = await import("./rate-limit");

describe("rateLimit", () => {
  it("allows up to the limit then blocks until the window resets", () => {
    vi.useFakeTimers();
    for (let i = 0; i < 3; i++) expect(rateLimit("k", 3, 1000)).toBe(true);
    expect(rateLimit("k", 3, 1000)).toBe(false);
    vi.advanceTimersByTime(1001);
    expect(rateLimit("k", 3, 1000)).toBe(true);
    vi.useRealTimers();
  });
});
