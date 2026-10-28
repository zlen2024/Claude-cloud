import { describe, it, expect, beforeAll } from "vitest";
import { Simulation } from "eecircuit-engine";
import { LESSONS } from "../src/lessons.js";
import { buildSignals } from "../src/signals.js";
import { f3db, unityGainFreq } from "../src/measure.js";

const sig = (res, name) => {
  const d = res.data.find((x) => x.name === name);
  if (!d) throw new Error(`signal ${name} tak jumpa. Ada: ${res.data.map((x) => x.name).join(", ")}`);
  return d.values;
};
const min = (a) => a.reduce((m, v) => Math.min(m, v), Infinity);
const max = (a) => a.reduce((m, v) => Math.max(m, v), -Infinity);
const last = (a) => a[a.length - 1];

const checks = {
  "inverter-vtc": (r) => {
    const o = sig(r, "v(out)");
    expect(o[0]).toBeCloseTo(1.8, 1);
    expect(Math.abs(last(o))).toBeLessThan(0.05);
  },
  "inverter-tran": (r) => {
    const o = sig(r, "v(out)");
    expect(min(o)).toBeLessThan(0.2);
    expect(max(o)).toBeGreaterThan(1.6);
  },
  "nmos-idvg": (r) => {
    const i = sig(r, "i(vd)").map(Math.abs);
    expect(i[0]).toBeLessThan(1e-6);
    expect(last(i)).toBeGreaterThan(1e-4);
  },
  "pmos-idvg": (r) => {
    const i = sig(r, "i(vd)").map(Math.abs);
    expect(i[0]).toBeLessThan(1e-6);
    expect(last(i)).toBeGreaterThan(2e-5);
  },
  "nmos-family": (r, lesson) => {
    const b = buildSignals(r, lesson.netlist);
    expect(b.segments).toHaveLength(5);
    expect(b.segLabels[4]).toBe("vg = 1.8");
    const id = sig(r, "i(vd)").map((v) => -v);
    const [s0, e0] = b.segments[0];
    const [s4, e4] = b.segments[4];
    expect(id[e4 - 1]).toBeGreaterThan(id[e0 - 1]);
    // saturation: arus pada Vds=1.8 hampir sama dengan Vds=1.4 (kecerunan kecil) berbanding triode
    expect(id[e4 - 1] / id[e4 - 9]).toBeLessThan(1.15);
    expect(id[s4 + 2] / id[s4 + 1]).toBeGreaterThan(1.5);
    expect(id[s0]).toBeCloseTo(0, 9);
  },
  "cs-ac": (r, lesson) => {
    expect(r.dataType).toBe("complex");
    const b = buildSignals(r, lesson.netlist);
    const out = b.signals.find((s) => s.name === "v(out)");
    expect(out.mag[0]).toBeGreaterThan(12);
    expect(out.mag[0]).toBeLessThan(16);
    const f = Array.from(b.x), m = Array.from(out.mag);
    expect(f3db(f, m)).toBeGreaterThan(2e7);
    expect(f3db(f, m)).toBeLessThan(3e8);
    expect(unityGainFreq(f, m)).toBeGreaterThan(f3db(f, m));
    // fasa DC ~ 180 darjah (penguat songsang)
    expect(Math.abs(Math.abs(out.phase[0]) - 180)).toBeLessThan(5);
  },
};

describe("lessons through ngspice-wasm", () => {
  let sim;
  beforeAll(async () => {
    sim = new Simulation(); // satu instance, dijalankan berulang kali (macam dalam browser)
    await sim.start();
  });

  for (const lesson of LESSONS) {
    it(lesson.title, async () => {
      sim.setNetList(lesson.netlist);
      const res = await sim.runSim();
      const errs = sim.getError().filter((l) => l.trim());
      expect(errs).toEqual([]);
      checks[lesson.id](res, lesson);
    }, 60000);
  }
});
