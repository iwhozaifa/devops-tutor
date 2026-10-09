import type { MetadataRoute } from "next";

export const dynamic = "force-dynamic";

// Only the public pages; everything else requires a login
export default function sitemap(): MetadataRoute.Sitemap {
  const base = (process.env.AUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/register`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/login`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${base}/privacy`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${base}/terms`, changeFrequency: "yearly", priority: 0.2 },
  ];
}
