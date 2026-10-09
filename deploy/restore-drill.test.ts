import { execFileSync } from "node:child_process";
import { chmodSync, mkdtempSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

// A fake `aws` CLI: logs each call and answers from canned responses, so the
// drill's control flow (including cleanup on failure) is tested offline.
const FAKE_AWS = `#!/usr/bin/env bash
echo "$*" >> "$FAKE_LOG"
case "$1 $2" in
  "rds describe-db-snapshots") echo "\${FAKE_SNAPSHOT-rds:devops-tutor-2026-10-08-02-05}" ;;
  "rds restore-db-instance-from-db-snapshot") [ -n "$FAKE_RESTORE_FAILS" ] && exit 254; echo "{}" ;;
  "rds wait") ;;
  "rds describe-db-instances") echo "devops-tutor-drill.abc.eu-west-1.rds.amazonaws.com" ;;
  "ssm send-command") echo "cmd-123" ;;
  "ssm wait") ;;
  "ssm get-command-invocation") echo "\${FAKE_CHECK_STATUS:-Success}" ;;
  "rds delete-db-instance") echo "{}" ;;
  *) echo "unexpected aws call: $*" >&2; exit 2 ;;
esac
`;

function drill(env: Record<string, string> = {}, args: string[] = []) {
  const dir = mkdtempSync(path.join(tmpdir(), "drill-"));
  writeFileSync(path.join(dir, "aws"), FAKE_AWS);
  chmodSync(path.join(dir, "aws"), 0o755);
  const log = path.join(dir, "calls.log");
  let status = 0;
  let output = "";
  try {
    output = execFileSync("bash", ["deploy/restore-drill.sh", ...args], {
      encoding: "utf8",
      stdio: "pipe",
      env: {
        NODE_ENV: "test",
        PATH: `${dir}:${process.env.PATH}`,
        FAKE_LOG: log,
        DB_INSTANCE: "devops-tutor",
        EC2_INSTANCE_ID: "i-0123456789abcdef0",
        DB_SECURITY_GROUP_ID: "sg-0db",
        MIGRATE_IMAGE_REPO: "123456789012.dkr.ecr.eu-west-1.amazonaws.com/devops-tutor-migrate",
        AWS_REGION: "eu-west-1",
        POLL_SECONDS: "0",
        ...env,
      },
    });
  } catch (e) {
    const err = e as { status: number; stdout: string; stderr: string };
    status = err.status;
    output = err.stdout + err.stderr;
  }
  const calls = existsSync(log) ? readFileSync(log, "utf8").trim().split("\n").filter(Boolean) : [];
  return { status, output, calls };
}

const verbs = (calls: string[]) => calls.map((c) => c.split(" ").slice(0, 2).join(" "));

describe("restore drill", () => {
  it("restores the latest snapshot privately, verifies it on the instance, then deletes it", () => {
    const { status, calls } = drill();
    expect(status).toBe(0);
    expect(verbs(calls)).toEqual([
      "rds describe-db-snapshots",
      "rds restore-db-instance-from-db-snapshot",
      "rds wait",
      "rds describe-db-instances",
      "ssm send-command",
      "ssm wait",
      "ssm get-command-invocation",
      "rds delete-db-instance",
    ]);
    const restore = calls[1];
    expect(restore).toContain("--db-snapshot-identifier rds:devops-tutor-2026-10-08-02-05");
    expect(restore).toMatch(/--db-instance-identifier devops-tutor-drill-\d{8}-\d{6}/);
    expect(restore).toContain("--no-publicly-accessible");
    expect(restore).toContain("--no-multi-az");
    expect(restore).toContain("--vpc-security-group-ids sg-0db");
    expect(calls[4]).toContain("--instance-ids i-0123456789abcdef0");
    expect(calls[7]).toContain("--skip-final-snapshot");
    expect(calls[7]).toMatch(/--db-instance-identifier devops-tutor-drill-/);
  });

  it("fails, but still deletes the drill instance, when verification fails", () => {
    const { status, calls, output } = drill({ FAKE_CHECK_STATUS: "Failed" });
    expect(status).toBe(1);
    expect(output).toMatch(/verification failed/i);
    expect(verbs(calls).at(-1)).toBe("rds delete-db-instance");
  });

  it("cleans up when the restore itself fails", () => {
    const { status, calls } = drill({ FAKE_RESTORE_FAILS: "1" });
    expect(status).not.toBe(0);
    expect(verbs(calls).at(-1)).toBe("rds delete-db-instance");
  });

  it("stops before restoring when there is no automated snapshot", () => {
    const { status, calls, output } = drill({ FAKE_SNAPSHOT: "None" });
    expect(status).toBe(1);
    expect(output).toMatch(/no automated snapshot/i);
    expect(verbs(calls)).toEqual(["rds describe-db-snapshots"]);
  });

  it("only prints the plan with --dry-run", () => {
    const { status, calls, output } = drill({}, ["--dry-run"]);
    expect(status).toBe(0);
    expect(calls).toEqual([]);
    expect(output).toContain("restore-db-instance-from-db-snapshot");
    expect(output).toContain("delete-db-instance");
  });
});
