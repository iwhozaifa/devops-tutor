import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { runRestoreCheck } from "../../scripts/restore-check";
import { createCurriculum, createUser } from "../helpers/fixtures";

describe("restore check", () => {
  it("passes on a database with the full schema and data", async () => {
    await createCurriculum();
    await createUser();

    const report = await runRestoreCheck(process.env.DATABASE_URL!);

    expect(report.ok).toBe(true);
    expect(report.pendingMigrations).toEqual([]);
    expect(report.counts.User).toBe(1);
    expect(report.counts.Subject).toBe(1);
  });

  it("fails when the restored database has no users or curriculum", async () => {
    const report = await runRestoreCheck(process.env.DATABASE_URL!);
    expect(report.ok).toBe(false);
    expect(report.problems).toEqual(expect.arrayContaining(["User table is empty", "Subject table is empty"]));
  });

  it("exits non-zero from the CLI when the check fails, and prints a JSON report", () => {
    let status = 0;
    let out = "";
    try {
      out = execFileSync("npx", ["tsx", "scripts/restore-check.ts"], { env: process.env, encoding: "utf8" });
    } catch (e) {
      const err = e as { status: number; stdout: string };
      status = err.status;
      out = err.stdout;
    }
    expect(status).toBe(1);
    expect(JSON.parse(out)).toMatchObject({ ok: false });
  });
});
