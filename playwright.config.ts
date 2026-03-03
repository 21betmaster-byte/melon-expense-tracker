import { defineConfig, devices } from "@playwright/test";
import * as path from "path";
import * as fs from "fs";
import * as dotenv from "dotenv";

// Load .env.test first (test credentials), fall back to .env.local (app config).
// This means TEST_USER_EMAIL / TEST_USER_PASSWORD just need to be set once in .env.test.
const envTestPath = path.resolve(__dirname, ".env.test");
if (fs.existsSync(envTestPath)) {
  dotenv.config({ path: envTestPath, override: false });
}
dotenv.config({ path: path.resolve(__dirname, ".env.local"), override: false });

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: "html",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "setup",
      testMatch: /.*\.setup\.ts/,
    },
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "tests/setup/.auth/user.json",
      },
      dependencies: ["setup"],
      testIgnore: /.*\.setup\.ts/,
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
