import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  test: {
    environment: "node",
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          include: ["src/**/*.test.ts", "scripts/**/*.test.ts"],
        },
      },
      {
        // Route handlers and server actions against a real Postgres.
        // TEST_DATABASE_URL must point at a disposable database: every test
        // truncates the user-data tables.
        extends: true,
        test: {
          name: "integration",
          include: ["tests/integration/**/*.test.ts"],
          globalSetup: ["tests/integration/global-setup.ts"],
          setupFiles: ["tests/integration/setup.ts"],
          env: {
            DATABASE_URL: process.env.TEST_DATABASE_URL ?? "",
            DB_POOL_MAX: "2",
            AUTH_SECRET: "integration-tests-only-secret-0123456789",
          },
          // One database, so test files run one at a time
          fileParallelism: false,
          // next-auth imports "next/server" without an extension, which
          // Node's ESM loader rejects; let Vite resolve it instead
          server: { deps: { inline: ["next-auth", "@auth/core"] } },
          testTimeout: 20_000,
          hookTimeout: 60_000,
        },
      },
    ],
  },
});
