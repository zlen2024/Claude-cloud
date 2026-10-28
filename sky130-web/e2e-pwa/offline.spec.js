import { test, expect } from "@playwright/test";

test("manifest dan service worker tersedia", async ({ page, request }) => {
  const m = await request.get("/manifest.webmanifest");
  expect(m.ok()).toBe(true);
  expect((await m.json()).name).toContain("SKY130");
  await page.goto("/");
  const reg = await page.evaluate(async () => {
    const r = await navigator.serviceWorker.ready;
    return !!r.active;
  });
  expect(reg).toBe(true);
});

test("selepas dimuat sekali, lab berjalan luar talian", async ({ page, context }) => {
  await page.goto("/");
  await page.evaluate(() => navigator.serviceWorker.ready);
  // pastikan service worker mengawal halaman sebelum engine dimuat turun
  await page.reload();
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  await page.click("#run");
  await expect(page.locator("#status")).toContainText("OK", { timeout: 90000 });

  await context.setOffline(true);
  await page.reload();
  await expect(page.locator("#outline button").first()).toBeVisible();
  await page.click('[data-lesson="b1-inverter-vtc"]');
  await page.click("#run");
  await expect(page.locator("#status")).toContainText("OK", { timeout: 90000 });
  await expect(page.locator("#legend")).toContainText("v(out)");
});
