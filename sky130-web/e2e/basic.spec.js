import { test, expect } from "@playwright/test";

test("lesson 1: Run menghasilkan v(out) dalam legend", async ({ page }) => {
  await page.goto("/");
  await page.click("#run");
  await expect(page.locator("#status")).toContainText("OK", { timeout: 60000 });
  await expect(page.locator("#legend")).toContainText("v(out)");
});
