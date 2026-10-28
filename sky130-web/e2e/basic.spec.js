import { test, expect } from "@playwright/test";

test("lesson 1: Run menghasilkan v(out) dalam legend", async ({ page }) => {
  await page.goto("/");
  await page.click("#run");
  await expect(page.locator("#status")).toContainText("OK", { timeout: 60000 });
  await expect(page.locator("#legend")).toContainText("v(out)");
});

const HEAVY = `* inverter, transient berat
.param mc_switch=0
.option scale=1.0u
.include modelcard.skywater
xm1 out in 0 0 sky130_fd_pr__nfet_01v8 w=0.42 l=0.15
xm2 out in vdd vdd sky130_fd_pr__pfet_01v8 w=1.0 l=0.15
cl out 0 10f
vdd vdd 0 1.8
vin in 0 pulse(0 1.8 1u 1n 1n 0.5u 1u)
.tran 1n 80u 0 1n
.end
`;

test("Run -> Stop -> Run lagi", async ({ page }) => {
  await page.goto("/");
  await page.fill("#editor", HEAVY);
  await page.click("#run");
  await expect(page.locator("#stop")).toBeEnabled();
  await page.click("#stop");
  await expect(page.locator("#status")).toContainText("Engine dimulakan semula");
  await expect(page.locator("#run")).toBeEnabled();
  await page.click("#reset");
  await page.click("#run");
  await expect(page.locator("#status")).toContainText("OK", { timeout: 60000 });
});

test("UI kekal responsif semasa transient besar", async ({ page }) => {
  await page.goto("/");
  await page.fill("#editor", HEAVY);
  await page.click("#run");
  // ukur selang antara frame semasa simulation (main thread bebas = frame berterusan)
  const maxGap = await page.evaluate(
    () =>
      new Promise((resolve) => {
        let last = performance.now();
        let max = 0;
        const t0 = last;
        const tick = (now) => {
          max = Math.max(max, now - last);
          last = now;
          if (now - t0 < 1500) requestAnimationFrame(tick);
          else resolve(max);
        };
        requestAnimationFrame(tick);
      }),
  );
  expect(maxGap).toBeLessThan(300);
  await expect(page.locator("#status")).toContainText("OK", { timeout: 60000 });
  const n = Number((await page.locator("#status").innerText()).match(/(\d+) titik/)[1]);
  console.log("titik:", n);
});
