import { execFileSync } from "node:child_process";
import { Client } from "pg";

// Fresh schema and the real curriculum seed before the run.
export default async function globalSetup() {
  const url = process.env.E2E_DATABASE_URL;
  if (!url) throw new Error("E2E_DATABASE_URL is not set (use a disposable database)");
  const env = { ...process.env, DATABASE_URL: url, MIGRATE_DATABASE_URL: url };

  execFileSync("npx", ["prisma", "migrate", "deploy"], { env, stdio: "inherit" });

  const client = new Client({ connectionString: url });
  await client.connect();
  const { rows } = await client.query<{ tablename: string }>(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`
  );
  if (rows.length) {
    await client.query(`TRUNCATE ${rows.map((r) => `"${r.tablename}"`).join(", ")} CASCADE`);
  }
  await client.end();

  execFileSync("npx", ["tsx", "prisma/seed/index.ts"], { env, stdio: "inherit" });
}
