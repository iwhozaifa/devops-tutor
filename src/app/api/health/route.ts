import { NextRequest } from "next/server";
import { liveness, readiness } from "@/lib/health";

export const dynamic = "force-dynamic";

// GET /api/health          liveness: the process is serving requests
// GET /api/health?ready=1  readiness: the database answers within 2 seconds
//                          (also at /api/health/ready, used by the ALB)
export async function GET(request: NextRequest) {
  return request.nextUrl.searchParams.has("ready") ? readiness() : liveness();
}
