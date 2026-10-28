import { describe, it, expect } from "vitest";
import {
  crossing, crossings, valueAt, max, min, slope, riseTime, propDelay,
  gainDb, f3db, unityGainFreq, phaseMargin, unwrapDeg,
} from "../src/measure.js";

const x = [0, 1, 2, 3, 4];
describe("measure", () => {
  it("crossing rising/falling/any", () => {
    const y = [0, 2, 0, 2, 0];
    expect(crossing(x, y, 1, "rising")).toBeCloseTo(0.5);
    expect(crossing(x, y, 1, "falling")).toBeCloseTo(1.5);
    expect(crossings(x, y, 1)).toHaveLength(4);
    expect(crossing(x, y, 5)).toBeNull();
    expect(crossing(x, y, 1, "any", 1)).toBeCloseTo(1.5);
  });
  it("crossing tanpa pembahagian sifar bila rata", () => {
    expect(crossing([0, 1], [1, 1], 1, "rising")).toBeNull();
  });
  it("valueAt", () => {
    expect(valueAt(x, [0, 10, 20, 30, 40], 2.5)).toBeCloseTo(25);
    expect(valueAt(x, [0, 10, 20, 30, 40], 9)).toBeNull();
    expect(valueAt([2, 1, 0], [20, 10, 0], 0.5)).toBeCloseTo(5);
    expect(valueAt([0, 0], [1, 2], 0)).toBe(2);
  });
  it("max min", () => {
    expect(max([1, 5, 3])).toBe(5);
    expect(min([4, 2, 9])).toBe(2);
  });
  it("slope", () => {
    expect(slope(x, [0, 2, 4, 6, 8], 2)).toBeCloseTo(2);
    expect(slope(x, [0, 2, 4, 6, 8], 99)).toBeNull();
    expect(slope([0], [0], 0)).toBeNull();
  });
  it("riseTime 10-90", () => {
    const t = [0, 1, 2, 3];
    const v = [0, 0, 10, 10];
    expect(riseTime(t, v, 1, 9)).toBeCloseTo(0.8);
    expect(riseTime(t, [0, 0, 0, 0], 1, 9)).toBeNull();
    expect(riseTime(t, [0, 5, 5, 5], 1, 9)).toBeNull();
  });
  it("propDelay", () => {
    const t = [0, 1, 2, 3, 4, 5];
    const vin = [0, 0, 2, 2, 2, 2];
    const vout = [2, 2, 2, 2, 0, 0];
    expect(propDelay(t, vin, vout, 1)).toBeCloseTo(2);
    expect(propDelay(t, [0, 0, 0, 0, 0, 0], vout, 1)).toBeNull();
    expect(propDelay(t, vin, [2, 2, 2, 2, 2, 2], 1)).toBeNull();
  });
  it("gainDb", () => {
    expect(gainDb(10)).toBeCloseTo(20);
    expect(gainDb({ real: 3, img: 4 })).toBeCloseTo(20 * Math.log10(5));
  });
  // satu kutub: A0=100 (40 dB), fp=1kHz
  const f = Array.from({ length: 61 }, (_, i) => 10 ** (i / 6)); // 1 Hz .. 1e10
  const fp = 1e3;
  const mag = f.map((v) => -10 * Math.log10(1 + (v / fp) ** 2) + 40);
  const ph = f.map((v) => -(Math.atan(v / fp) * 180) / Math.PI);
  it("f3db ~ fp", () => expect(f3db(f, mag) / fp).toBeCloseTo(1, 1));
  it("unityGainFreq ~ A0*fp", () => expect(unityGainFreq(f, mag) / 1e5).toBeCloseTo(1, 1));
  it("phaseMargin sistem satu kutub ~ 90", () => expect(Math.abs(phaseMargin(f, mag, ph) - 90)).toBeLessThan(1));
  it("phaseMargin amplifier songsang guna rujukan DC", () => {
    const inv = ph.map((p) => 180 + p);
    const wrapped = inv.map((p) => ((p + 180) % 360) - 180);
    expect(Math.abs(phaseMargin(f, mag, wrapped) - 90)).toBeLessThan(1);
  });
  it("tiada fu -> null", () => {
    expect(unityGainFreq(f, mag.map((m) => m + 1000))).toBeNull();
    expect(phaseMargin(f, mag.map((m) => m + 1000), ph)).toBeNull();
    expect(f3db(f, mag.map(() => 0))).toBeNull();
  });
  it("unwrapDeg", () => {
    expect(unwrapDeg([170, 179, -178, -170])).toEqual([170, 179, 182, 190]);
    expect(unwrapDeg([-170, -179, 178])).toEqual([-170, -179, -182]);
  });
});

import { vthExtrap } from "../src/measure.js";
describe("vthExtrap", () => {
  it("MOSFET segi empat sama: Id = k (Vgs - 0.5)^2 -> Vth ~ 0.5 (tangen di gm max)", () => {
    const v = Array.from({ length: 181 }, (_, i) => i * 0.01);
    // kuasa dua sehingga 1.0, kemudian linear (gm tepu), seperti peranti sebenar halaju tepu
    const id = v.map((x) => (x < 0.5 ? 0 : x < 1 ? 1e-3 * (x - 0.5) ** 2 : 1e-3 * (0.25 + (x - 1) * 1)));
    expect(vthExtrap(v, id)).toBeGreaterThan(0.5);
    expect(vthExtrap(v, id)).toBeLessThan(0.9);
  });
  it("data terlalu pendek atau rata -> null", () => {
    expect(vthExtrap([0, 1], [0, 1])).toBeNull();
    expect(vthExtrap([0, 1, 2], [0, 0, 0])).toBeNull();
  });
});
