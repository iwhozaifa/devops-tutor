import { describe, expect, it } from "vitest";
import { GET as ready } from "@/app/api/health/ready/route";

describe("GET /api/health/ready", () => {
  it("is the path form of ?ready=1, for load balancers that take a plain path", async () => {
    const res = await ready();
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(await res.json()).toMatchObject({ status: "ok", database: "ok" });
  });
});
