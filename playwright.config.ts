import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  expect: {
    timeout: 5_000
  },
  use: {
    baseURL: "http://127.0.0.1:5173/quant/",
    trace: "retain-on-failure"
  },
  webServer: {
    command: "npm run dev -- --port 5173",
    url: "http://127.0.0.1:5173/quant/",
    reuseExistingServer: true,
    timeout: 20_000
  },
  projects: [
    {
      name: "android-chrome",
      use: {
        ...devices["Pixel 5"],
        viewport: { width: 393, height: 851 }
      }
    },
    {
      name: "desktop-chrome",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 720 }
      }
    }
  ]
});
