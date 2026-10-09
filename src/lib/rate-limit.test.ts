import { describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({ headers: vi.fn() }));
const { clientIpFrom, rateLimit } = await import("./rate-limit");

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

describe("clientIpFrom", () => {
  const xff = (v: string) => new Headers({ "x-forwarded-for": v });

  it("ignores client-supplied entries left of the trusted proxy", () => {
    // Client sent "X-Forwarded-For: 1.1.1.1"; the ALB appended the real address
    expect(clientIpFrom(xff("1.1.1.1, 203.0.113.7"), 1)).toBe("203.0.113.7");
  });

  it("walks back one entry per trusted proxy", () => {
    expect(clientIpFrom(xff("1.1.1.1, 203.0.113.7, 10.0.0.5"), 2)).toBe("203.0.113.7");
  });

  it("uses the only entry when there are fewer entries than hops", () => {
    expect(clientIpFrom(xff("203.0.113.7"), 2)).toBe("203.0.113.7");
  });

  it("returns unknown without the header", () => {
    expect(clientIpFrom(new Headers(), 1)).toBe("unknown");
  });
});
