import { defineConfig } from "vitest/config";

// Vitest must not collect Playwright specs (tests/e2e/*.spec.ts).
// Default excludes are preserved; e2e specs run under `npm run test:e2e`.
export default defineConfig({
  test: {
    exclude: [
      "tests/e2e/**",
      "rc-e2e/**",
      "**/node_modules/**",
      "**/dist/**",
      "**/cypress/**",
      "**/.{idea,git,cache,output,temp}/**"
    ]
  }
});
