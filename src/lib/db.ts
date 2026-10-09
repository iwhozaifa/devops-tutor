import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Read directly (not via env()) so `next build` can import this without a
// database; src/instrumentation.ts validates both at server start.
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
  // Keep (instances x DB_POOL_MAX) under the RDS max_connections
  max: Number(process.env.DB_POOL_MAX) || 10,
});

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const db = globalForPrisma.prisma || new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
