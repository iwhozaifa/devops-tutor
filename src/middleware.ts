import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // ── Security headers ─────────────────────────────────────────────
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()"
  );

  // ── Rate-limiting awareness (stubs) ──────────────────────────────
  // Actual rate limiting should be handled at the reverse-proxy level
  // (e.g. Nginx, Cloudflare, AWS WAF). These headers provide a
  // contract that upstream proxies or API gateways can populate.
  if (!response.headers.has("X-RateLimit-Limit")) {
    response.headers.set("X-RateLimit-Limit", "100");
  }
  if (!response.headers.has("X-RateLimit-Remaining")) {
    response.headers.set("X-RateLimit-Remaining", "100");
  }
  if (!response.headers.has("X-RateLimit-Reset")) {
    response.headers.set(
      "X-RateLimit-Reset",
      String(Math.floor(Date.now() / 1000) + 60)
    );
  }

  return response;
}

export const config = {
  // Apply to all routes except static assets and Next.js internals
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
