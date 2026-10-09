import { NextResponse } from "next/server";
import { db } from "./db";
import { logger } from "./logger";

const noStore = { "Cache-Control": "no-store" };

const version = () => process.env.APP_VERSION ?? "dev";

export function liveness() {
  return NextResponse.json({ status: "ok", version: version() }, { headers: noStore });
}

/** 200 when the database answers within 2 seconds, otherwise 503. */
export async function readiness() {
  let timer: NodeJS.Timeout | undefined;
  try {
    await Promise.race([
      db.$queryRaw`SELECT 1`,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error("database check timed out")), 2000);
      }),
    ]);
    return NextResponse.json({ status: "ok", version: version(), database: "ok" }, { headers: noStore });
  } catch (err) {
    logger.warn("readiness check failed", { err });
    return NextResponse.json(
      { status: "unavailable", version: version(), database: "unreachable" },
      { status: 503, headers: noStore }
    );
  } finally {
    clearTimeout(timer);
  }
}
