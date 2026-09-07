import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./rc-e2e",
  timeout: 420000,
  expect: { timeout: 15000 },
  workers: 1,
  fullyParallel: false,
  retries: 0,
  reporter: [["list"]],
  use: { trace: "off" },
});
