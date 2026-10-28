import { describe, it, expect, beforeAll } from "vitest";
import { Simulation } from "eecircuit-engine";
import { LESSONS, MODULES } from "../src/lessons/index.js";
import { runChecks } from "../src/checks.js";

describe("lesson registry", () => {
  it("ada lesson dengan id unik dan modul sah", () => {
    expect(LESSONS.length).toBeGreaterThan(0);
    expect(new Set(LESSONS.map((l) => l.id)).size).toBe(LESSONS.length);
    for (const l of LESSONS) {
      expect(Object.keys(MODULES)).toContain(l.module);
      expect(l.md.length).toBeGreaterThan(50);
      expect(l.netlist).toBeTruthy();
      expect(l.solution, `${l.id} tiada solution.cir`).toBeTruthy();
      expect(l.checks.length).toBeGreaterThan(0);
      for (const c of l.checks) expect((c.hints ?? []).length).toBeLessThanOrEqual(2); // hint ketiga = diff penyelesaian
    }
  });
});

describe("lessons through ngspice-wasm", () => {
  let sim;
  beforeAll(async () => {
    sim = new Simulation(); // satu instance, dijalankan berulang kali (macam dalam browser)
    await sim.start();
  });
  const simulate = async (netlist) => {
    sim.setNetList(netlist);
    const res = await sim.runSim();
    return { res, errs: sim.getError().filter((l) => /error|fatal/i.test(l)) };
  };

  for (const lesson of LESSONS) {
    describe(lesson.id, () => {
      it("circuit.cir simulate tanpa ralat", async () => {
        const { res, errs } = await simulate(lesson.netlist);
        expect(errs).toEqual([]);
        expect(res.numVariables).toBeGreaterThan(0);
      }, 60000);

      it("circuit.cir gagal sekurang-kurangnya satu semakan (ada tugasan)", async () => {
        const { res } = await simulate(lesson.netlist);
        const out = runChecks(lesson.checks, res, lesson.netlist);
        expect(out.some((c) => !c.pass), JSON.stringify(out)).toBe(true);
      }, 60000);

      it("solution.cir lulus semua semakan", async () => {
        const { res, errs } = await simulate(lesson.solution);
        expect(errs).toEqual([]);
        const out = runChecks(lesson.checks, res, lesson.solution);
        const bad = out.filter((c) => !c.pass);
        expect(bad, JSON.stringify(bad)).toEqual([]);
      }, 60000);
    });
  }
});
