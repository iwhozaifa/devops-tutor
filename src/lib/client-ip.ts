import { headers } from "next/headers";
import { env } from "./env";

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
