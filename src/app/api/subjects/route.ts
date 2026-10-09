import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

// Rendered per request: an ISR route is prerendered during `next build`,
// which has no database in the Docker build and would cache the error.
// Browsers and any CDN may still cache it via the Cache-Control header below.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const subjects = await db.subject.findMany({
      where: { isPublished: true },
      include: {
        modules: {
          include: {
            _count: { select: { days: true } },
          },
          orderBy: { sortOrder: "asc" },
        },
      },
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json(subjects, {
      headers: {
        "Cache-Control":
          "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch (err) {
    logger.error("failed to fetch subjects", { route: "/api/subjects", err });
    return NextResponse.json(
      { error: "Failed to fetch subjects" },
      { status: 500 }
    );
  }
}
