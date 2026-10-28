import { test, expect } from "@playwright/test";

const BROKEN = `* rosak
.param mc_switch=0
.option scale=1.0u
.include modelcard.skywater
xm1 d g 0 0 sky130_fd_pr__nfet_01v8 w=2 l=0.5
vd d 0 1
vg g 0 1
.op
.end
`;
const set = (page, text) => page.locator("#editor .cm-content").fill(text);

test("netlist rosak: garis bawah ralat pada baris yang betul", async ({ page }) => {
  await page.goto("/");
  await set(page, BROKEN);
  await page.click("#run");
  await expect(page.locator("#status")).toContainText("Error", { timeout: 60000 });
  await expect(page.locator("#editor .cm-lintRange-error")).toHaveCount(1);
  await expect(page.locator("#log")).toContainText("Baris 5");
  await expect(page.locator("#log")).toContainText("bin");
});

test("hint header: satu klik menambah tiga baris wajib", async ({ page }) => {
  await page.goto("/");
  await set(page, "* t\nxm1 d g 0 0 sky130_fd_pr__nfet_01v8 w=1 l=0.15\nvd d 0 1\nvg g 0 1\n.op\n.end\n");
  await expect(page.locator("#fix-header")).toBeVisible();
  await page.click("#fix-header");
  await expect(page.locator("#fix-header")).toHaveCount(0);
  const text = await page.locator("#editor .cm-content").innerText();
  expect(text).toContain("modelcard.skywater");
  expect(text).toContain("mc_switch");
  await page.click("#run");
  await expect(page.locator("#status")).toContainText("OK", { timeout: 60000 });
});

test("hint m1 dengan model sky130", async ({ page }) => {
  await page.goto("/");
  await set(page, BROKEN.replace("xm1", "m1").replace("w=2 l=0.5", "w=1 l=0.15"));
  await expect(page.locator("#editor .cm-lintRange-warning")).toHaveCount(1, { timeout: 5000 });
});

test("autosave dan reset", async ({ page }) => {
  await page.goto("/");
  await set(page, "* suntingan saya\n.op\n.end\n");
  await page.waitForTimeout(400);
  await page.reload();
  await expect(page.locator("#editor .cm-content")).toContainText("suntingan saya");
  await page.click("#reset");
  await expect(page.locator("#editor .cm-content")).toContainText("SKY130 inverter");
});

test("pautan kongsi pergi-balik ke Scratch", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/");
  await set(page, "* kongsi ini\n.op\n.end\n");
  await page.click("#share");
  await expect.poll(() => page.evaluate(() => location.hash)).toMatch(/^#s=/);
  const url = page.url();
  const p2 = await context.newPage();
  await p2.goto(url);
  await expect(p2.locator("#editor .cm-content")).toContainText("kongsi ini");
  await expect(p2.locator("#lesson option:checked")).toContainText("Scratch");
});

test("Ctrl+Enter dalam editor menjalankan simulation", async ({ page }) => {
  await page.goto("/");
  await page.locator("#editor .cm-content").click();
  await page.keyboard.press("Control+Enter");
  await expect(page.locator("#status")).toContainText("OK", { timeout: 60000 });
});
