import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };

// GET /api/health          liveness: the process is serving requests
// GET /api/health?ready=1  readiness: the database answers within 2 seconds
export async function GET(request: NextRequest) {
  const version = process.env.APP_VERSION ?? "dev";

  if (!request.nextUrl.searchParams.has("ready")) {
    return NextResponse.json({ status: "ok", version }, { headers: noStore });
  }

  let timer: NodeJS.Timeout | undefined;
  try {
    await Promise.race([
      db.$queryRaw`SELECT 1`,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error("database check timed out")), 2000);
      }),
    ]);
    return NextResponse.json({ status: "ok", version, database: "ok" }, { headers: noStore });
  } catch (err) {
    logger.warn("readiness check failed", { err });
    return NextResponse.json(
      { status: "unavailable", version, database: "unreachable" },
      { status: 503, headers: noStore }
    );
  } finally {
    clearTimeout(timer);
  }
}
