import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3102";
const isExternalServer = Boolean(process.env.E2E_BASE_URL);

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    { name: "public-desktop", use: { ...devices["Desktop Chrome"] }, testMatch: "**/public.spec.ts" },
    { name: "public-mobile", use: { ...devices["Pixel 5"] }, testMatch: "**/public.spec.ts" },
    {
      name: "admin-anonymous",
      use: { ...devices["Desktop Chrome"] },
      testMatch: "**/admin.spec.ts",
    },
    {
      name: "admin-authenticated",
      use: { ...devices["Desktop Chrome"], ...(process.env.E2E_ADMIN_STORAGE_STATE ? { storageState: process.env.E2E_ADMIN_STORAGE_STATE } : {}) },
      testMatch: "**/admin.auth.spec.ts",
    },
  ],
  webServer: isExternalServer ? undefined : {
    command: "npm run start -- --hostname 127.0.0.1 --port 3102",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    // Browser QA uses committed storefront fixtures and never needs database credentials.
    env: { ...process.env, E2E_STATIC_FIXTURES: "1", NEXT_TELEMETRY_DISABLED: "1" },
  },
});
