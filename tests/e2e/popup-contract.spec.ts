import { test, expect } from "@playwright/test";

test("release candidate smoke contract", async ({ page }) => {
  await page.setContent(`
    <button id="extract">Extract text</button>
    <div id="status">Ready</div>
  `);
  await expect(page.locator("#extract")).toHaveText("Extract text");
  await expect(page.locator("#status")).toHaveText("Ready");
});
