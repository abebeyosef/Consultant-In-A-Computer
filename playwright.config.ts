import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3100);
export const BOT_PORT = Number(process.env.E2E_BOT_PORT ?? 3101);

export default defineConfig({
  testDir: "e2e",
  timeout: 120_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    ...devices["Desktop Chrome"],
    viewport: { width: 1440, height: 900 },
  },
  webServer: [
    {
      command: `npx next start -p ${PORT}`,
      url: `http://localhost:${PORT}/api/health`,
      reuseExistingServer: true,
      timeout: 120_000,
      env: { MOCK_MODE: "1" },
    },
    {
      // M13: same build with the meeting bot switched on (mock provider, no account needed)
      command: `npx next start -p ${BOT_PORT}`,
      url: `http://localhost:${BOT_PORT}/api/health`,
      reuseExistingServer: true,
      timeout: 120_000,
      env: { MOCK_MODE: "1", ENABLE_MEET_BOT: "1", MEET_BOT_PROVIDER: "mock" },
    },
  ],
});
