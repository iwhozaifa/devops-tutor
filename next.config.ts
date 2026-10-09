import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

// Next.js and next-themes inject inline scripts, so script-src needs
// 'unsafe-inline' unless nonces are introduced. The remaining directives
// still block framing, plugin content, base-tag hijacking and foreign
// form targets.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "font-src 'self' data:",
  `connect-src 'self'${isDev ? " ws:" : ""}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self' https://github.com",
  "frame-ancestors 'none'",
].join("; ");

const nextConfig: NextConfig = {
  // Self-contained server in .next/standalone for the Docker image
  output: "standalone",
  poweredByHeader: false,

  // Fix warning about multiple lockfiles by setting turbopack root
  turbopack: {
    root: __dirname,
  },

  // Security & caching headers applied at the edge
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          // Not in dev, so the browser does not pin localhost to https
          ...(isDev
            ? []
            : [
                {
                  key: "Strict-Transport-Security",
                  value: "max-age=63072000; includeSubDomains",
                },
              ]),
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
      {
        // Cache static assets aggressively
        source: "/favicon.ico",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, immutable",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
