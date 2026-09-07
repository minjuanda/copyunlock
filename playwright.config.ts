import { defineConfig } from "@playwright/test";
export default defineConfig({ testDir: "tests/e2e", timeout: 15000, use: { headless: true } });