import type { MetadataRoute } from "next";

// Read at request time so one image serves any domain
export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.AUTH_URL?.replace(/\/$/, "");
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/login", "/register"],
      disallow: ["/api/", "/admin", "/dashboard", "/subjects", "/profile", "/leaderboard"],
    },
    ...(base ? { sitemap: `${base}/sitemap.xml` } : {}),
  };
}
