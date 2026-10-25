import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:11003",
    reducedMotion: "reduce",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "bun run start",
    url: "http://127.0.0.1:11003",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
