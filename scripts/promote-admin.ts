// Usage: npm run admin:promote -- user@example.com [--demote]
import { PrismaClient } from "../src/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  const demote = process.argv.includes("--demote");

  if (!email) {
    console.error("Usage: npm run admin:promote -- <email> [--demote]");
    process.exit(1);
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error(`No user with email ${email}`);
    process.exit(1);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { role: demote ? "USER" : "ADMIN" },
  });
  console.log(`${email} is now ${demote ? "USER" : "ADMIN"}`);
}

main().finally(() => prisma.$disconnect());
