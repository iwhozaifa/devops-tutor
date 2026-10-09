import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const script = "scripts/ci/check-tests-changed.sh";

function run(files: string[]): { code: number; out: string } {
  try {
    const out = execFileSync("bash", [script], { input: files.join("\n"), encoding: "utf8" });
    return { code: 0, out };
  } catch (e) {
    const err = e as { status: number; stdout: string; stderr: string };
    return { code: err.status, out: err.stdout + err.stderr };
  }
}

describe("check-tests-changed", () => {
  it("fails when source changes without tests", () => {
    const r = run(["src/lib/auth.ts", "README.md"]);
    expect(r.code).toBe(1);
    expect(r.out).toMatch(/src\/lib\/auth\.ts/);
  });

  it("passes when a unit test changes alongside source", () => {
    expect(run(["src/lib/auth.ts", "src/lib/auth.test.ts"]).code).toBe(0);
  });

  it("passes with integration or e2e tests", () => {
    expect(run(["src/app/api/x/route.ts", "tests/integration/x.test.ts"]).code).toBe(0);
    expect(run(["prisma/schema.prisma", "e2e/flow.spec.ts"]).code).toBe(0);
  });

  it("passes when no source changed", () => {
    expect(run(["README.md", "docs/DEPLOYMENT.md", ".github/workflows/ci.yml"]).code).toBe(0);
  });

  it("ignores generated code and seed data", () => {
    expect(run(["src/generated/prisma/client.ts", "prisma/seed/subjects/devops/subject.json"]).code).toBe(0);
  });
});
