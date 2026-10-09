// Verifies a restored database: every migration in prisma/migrations is
// applied and the core tables hold data. Run inside the migrate image by
// deploy/restore-drill.sh:  npx tsx scripts/restore-check.ts
// Prints a JSON report; exits 1 when the restore is not usable.
import { readdirSync } from "node:fs";
import path from "node:path";
import { Client } from "pg";

const MUST_HAVE_ROWS = ["User", "Subject", "Module", "Day"] as const;
const COUNTED = [...MUST_HAVE_ROWS, "Enrollment", "XpLedger", "QuizAttempt", "ExamAttempt"] as const;

export interface RestoreReport {
  ok: boolean;
  pendingMigrations: string[];
  counts: Record<string, number>;
  problems: string[];
}

export async function runRestoreCheck(databaseUrl: string): Promise<RestoreReport> {
  const expected = readdirSync(path.join(process.cwd(), "prisma/migrations"), { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    const applied = await client.query<{ migration_name: string }>(
      `SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL`
    );
    const appliedNames = new Set(applied.rows.map((r) => r.migration_name));
    const pendingMigrations = expected.filter((m) => !appliedNames.has(m));

    const counts: Record<string, number> = {};
    for (const table of COUNTED) {
      const { rows } = await client.query<{ n: string }>(`SELECT count(*)::bigint AS n FROM "${table}"`);
      counts[table] = Number(rows[0].n);
    }

    const problems = [
      ...pendingMigrations.map((m) => `migration ${m} is not applied`),
      ...MUST_HAVE_ROWS.filter((t) => counts[t] === 0).map((t) => `${t} table is empty`),
    ];
    return { ok: problems.length === 0, pendingMigrations, counts, problems };
  } finally {
    await client.end();
  }
}

if (process.argv[1]?.endsWith("restore-check.ts")) {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set");
    process.exit(2);
  }
  runRestoreCheck(url).then(
    (report) => {
      console.log(JSON.stringify(report, null, 2));
      process.exit(report.ok ? 0 : 1);
    },
    (err) => {
      console.log(JSON.stringify({ ok: false, problems: [String(err)] }));
      process.exit(1);
    }
  );
}
