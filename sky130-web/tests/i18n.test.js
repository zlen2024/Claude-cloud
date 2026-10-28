import { describe, it, expect, afterEach } from "vitest";
import { t, setLang, getLang, _dictForTests } from "../src/i18n/index.js";

afterEach(() => setLang("ms", { persist: false }));

describe("i18n", () => {
  it("ms dan en mempunyai kunci yang sama", () => {
    expect(Object.keys(_dictForTests.en).sort()).toEqual(Object.keys(_dictForTests.ms).sort());
  });
  it("pembolehubah ditukar ganti dan kunci hilang dikembalikan", () => {
    expect(t("status.ok", { n: 5, ms: 7 })).toBe("OK · 5 titik · 7 ms");
    expect(t("tiada.kunci")).toBe("tiada.kunci");
    expect(t("status.nosignal")).toContain("{net}");
  });
  it("tukar bahasa", () => {
    setLang("en", { persist: false });
    expect(getLang()).toBe("en");
    expect(t("status.ready")).toBe("Ready");
    setLang("xx", { persist: false });
    expect(getLang()).toBe("en");
  });
  it("setiap rentetan mengekalkan pemegang tempat {x} yang sama dalam kedua-dua bahasa", () => {
    const ph = (s) => (s.match(/\{\w+\}/g) ?? []).sort().join();
    for (const k of Object.keys(_dictForTests.ms)) expect(ph(_dictForTests.en[k]), k).toBe(ph(_dictForTests.ms[k]));
  });
});
