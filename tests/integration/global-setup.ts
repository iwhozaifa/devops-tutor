import { execFileSync } from "node:child_process";

// Applies migrations once per run. Refuses to start without an explicit
// TEST_DATABASE_URL so the suite can never truncate a development database.
export default function setup() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) {
    throw new Error(
      "TEST_DATABASE_URL is not set. Point it at a disposable Postgres database, e.g.\n" +
        "  npx prisma dev -n test -d   # prints a postgres:// URL\n" +
        "  TEST_DATABASE_URL=<url> npm run test:integration"
    );
  }
  execFileSync("npx", ["prisma", "migrate", "deploy"], {
    env: { ...process.env, DATABASE_URL: url, MIGRATE_DATABASE_URL: url },
    stdio: "inherit",
  });
}
