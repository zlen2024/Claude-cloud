import { describe, it, expect, beforeAll } from "vitest";
import { Simulation } from "eecircuit-engine";
import { LESSONS } from "../src/lessons.js";

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
      checks[lesson.id](res);
    }, 60000);
  }
});
