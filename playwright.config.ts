import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.FAMILYAPP_E2E_BASE_URL?.trim();

export default defineConfig({
  forbidOnly: Boolean(process.env.CI),
  fullyParallel: false,
  reporter: "list",
  retries: process.env.CI ? 1 : 0,
  testDir: "./e2e",
  timeout: 60_000,
  use: {
    baseURL,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "production-smoke",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
