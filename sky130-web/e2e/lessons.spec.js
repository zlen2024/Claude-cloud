import { test, expect } from "@playwright/test";

const set = (page, text) => page.locator("#editor .cm-content").fill(text);

test("sidebar menyenaraikan modul dan lesson, dan memuat lesson", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#outline h3").first()).toContainText("A. MOSFET");
  await page.click('[data-lesson="b3-inverter-delay"]');
  await expect(page.locator("#lesson-md h1")).toContainText("transient");
  await expect(page.locator("#editor .cm-content")).toContainText("pulse(");
});

test("Semak: gagal -> petunjuk ladder -> penyelesaian lulus -> tanda siap kekal", async ({ page }) => {
  await page.goto("/");
  await page.click('[data-lesson="a1-nmos-idvgs"]');
  await page.click("#check");
  const drive = page.locator('.check[data-check="drive"]');
  await expect(drive).toHaveAttribute("data-pass", "false", { timeout: 60000 });
  // tangga petunjuk: 2 petunjuk teks + penyelesaian diff
  await drive.locator(".hint-btn").click();
  await expect(drive.locator(".hintbox")).toContainText("Petunjuk 1");
  await drive.locator(".hint-btn").click();
  await drive.locator(".hint-btn").click();
  await expect(drive.locator("pre")).toContainText("+ xm1 d g 0 0 sky130_fd_pr__nfet_01v8 w=3");
  await expect(drive.locator(".hint-btn")).toHaveCount(0);
  // guna penyelesaian
  await set(page, SOLUTION);
  await page.click("#check");
  await expect(page.locator(".checks .done")).toBeVisible({ timeout: 60000 });
  await expect(page.locator('[data-lesson="a1-nmos-idvgs"] .tick')).toBeVisible();
  await page.reload();
  await expect(page.locator('[data-lesson="a1-nmos-idvgs"] .tick')).toBeVisible();
});

const SOLUTION = `* SKY130 NMOS - Id vs Vgs
.param mc_switch=0
.option scale=1.0u
.include modelcard.skywater
xm1 d g 0 0 sky130_fd_pr__nfet_01v8 w=3 l=0.15
vd d 0 0.05
vg g 0 0
.dc vg 0 1.8 0.01
.end
`;

test("lesson tanpa petunjuk berlebihan dan butang Semak disorok untuk Scratch", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#check")).toBeVisible();
  await page.click('[data-lesson="scratch"]');
  await expect(page.locator("#check")).toBeHidden();
});

test("skema: tab Skema melukis litar dan klik net menogol isyarat dalam plot", async ({ page }) => {
  await page.goto("/");
  await page.click('[data-lesson="b1-inverter-vtc"]');
  await page.click("#run");
  await expect(page.locator("#status")).toContainText("OK", { timeout: 60000 });
  await page.click("#tab-schem");
  await expect(page.locator("#schem svg.schem")).toBeVisible();
  await expect(page.locator("#schem .el")).toHaveCount(4); // vdd, vin, xm1, xm2
  const inLabel = page.locator('#schem .netlabel[data-net="in"]').first();
  await expect(inLabel).toHaveClass(/on/);
  await inLabel.click();
  await expect(inLabel).not.toHaveClass(/on/);
  await page.click("#tab-plot");
  await expect(page.locator('#legend label:has-text("v(in)") input')).not.toBeChecked();
  await page.screenshot({ path: "test-results/schem-toggle.png" });
});

test("skema dikemas kini bila netlist diedit", async ({ page }) => {
  await page.goto("/");
  await page.click("#tab-schem");
  await page.locator("#editor .cm-content").fill("* t\nr1 a 0 1k\nr2 a b 2k\nc1 b 0 1p\nvs a 0 1\n.op\n");
  await expect(page.locator("#schem .el")).toHaveCount(4, { timeout: 5000 });
});
