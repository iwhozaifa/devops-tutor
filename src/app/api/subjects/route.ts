import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// Revalidate cached data every hour — subject data rarely changes
export const revalidate = 3600;

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
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch subjects" },
      { status: 500 }
    );
  }
}
