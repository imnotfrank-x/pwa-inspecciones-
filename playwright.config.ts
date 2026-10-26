import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  timeout: 60_000,
  globalTimeout: 300_000,

  expect: {
    timeout: 10_000,
  },

  outputDir: "test-results/e2e",

  reporter: [
    ["list"],
    ["html", {
      outputFolder: "playwright-report",
      open: "never",
    }],
    ["junit", {
      outputFile: "test-results/e2e.xml",
    }],
  ],

  use: {
    baseURL: "http://127.0.0.1:3108",
    serviceWorkers: "allow",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  webServer: {
    command: "npm run start -- --hostname 127.0.0.1 --port 3108",
    url: "http://127.0.0.1:3108/inspecciones",
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
