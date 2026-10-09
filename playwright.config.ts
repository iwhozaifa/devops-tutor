import { defineConfig, devices } from "@playwright/test";

// Runs against the production build (`npm run build` first) on a disposable
// database: E2E_DATABASE_URL is migrated, wiped and seeded by global-setup.
const PORT = Number(process.env.E2E_PORT ?? 3200);
const baseURL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "e2e",
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  globalSetup: "./e2e/global-setup.ts",
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // Use a system Chromium when Playwright's own browser isn't installed
        launchOptions: process.env.PW_CHROMIUM_PATH
          ? { executablePath: process.env.PW_CHROMIUM_PATH }
          : {},
      },
    },
  ],
  webServer: {
    command: "bash e2e/start-server.sh",
    url: `${baseURL}/api/health?ready=1`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    env: { PORT: String(PORT) },
  },
});
