// Usage: npm run admin:promote -- user@example.com [--demote] [--by <operator>]
// The change is recorded in the admin audit log as "cli:<operator>"
// (default: the OS user running the command).
import "dotenv/config";
import { userInfo } from "node:os";

async function main() {
  const args = process.argv.slice(2);
  const email = args.find((a, i) => !a.startsWith("--") && args[i - 1] !== "--by");
  const demote = args.includes("--demote");
  const byIndex = args.indexOf("--by");
  const operator = byIndex >= 0 ? args[byIndex + 1] : userInfo().username;

  if (!email || !operator) {
    console.error("Usage: npm run admin:promote -- <email> [--demote] [--by <operator>]");
    process.exit(1);
  }

  // Imported after dotenv so DATABASE_URL is set when the client is created
  const { setUserRole } = await import("../src/lib/audit");
  const { db } = await import("../src/lib/db");
  try {
    const result = await setUserRole({
      email,
      role: demote ? "USER" : "ADMIN",
      actor: { id: null, label: `cli:${operator}` },
    });
    console.log(result.changed ? `${email} is now ${result.to}` : `${email} is already ${result.to}`);
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  } finally {
    await db.$disconnect();
  }
}

main();
