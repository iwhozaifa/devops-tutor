import { headers } from "next/headers";
import { env } from "./env";

// Fixed-window, in-memory limiter. Per-process only: before running more than
// one app instance, move the buckets to Postgres or Redis.
const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    if (buckets.size > 10_000) {
      for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
    }
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  bucket.count++;
  return bucket.count <= limit;
}

// Each proxy appends the address it received the request from, so only the
// last `trustedHops` entries of X-Forwarded-For are trustworthy; anything to
// their left was supplied by the client. Without a proxy, Next.js sets the
// header to the socket address when the client did not send one.
export function clientIpFrom(h: Headers, trustedHops: number): string {
  const hops = (h.get("x-forwarded-for") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (hops.length === 0) return "unknown";
  return hops[Math.max(0, hops.length - trustedHops)];
}

export async function clientIp(): Promise<string> {
  return clientIpFrom(await headers(), env().TRUSTED_PROXY_HOPS);
}
