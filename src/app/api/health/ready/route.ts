import { readiness } from "@/lib/health";

export const dynamic = "force-dynamic";

// Path form of /api/health?ready=1 for the ALB target group health check
export function GET() {
  return readiness();
}
