// Jalankan semua lesson melalui engine ngspice-wasm dalam Node dan semak keputusan masuk akal.
// Guna: npm run smoke
import { Simulation } from "eecircuit-engine";
import { LESSONS } from "../src/lessons.js";

const sim = new Simulation(); // satu instance, dijalankan berulang kali (macam dalam browser)
await sim.start();

const sig = (res, name) => {
  const d = res.data.find((x) => x.name === name);
  if (!d) throw new Error(`signal ${name} tak jumpa. Ada: ${res.data.map((x) => x.name).join(", ")}`);
  return d.values;
};
const min = (a) => a.reduce((m, v) => Math.min(m, v), Infinity);
const max = (a) => a.reduce((m, v) => Math.max(m, v), -Infinity);

const checks = {
  "inverter-vtc": (r) => {
    const o = sig(r, "v(out)");
    return [
      ["Vout(Vin=0) ~ 1.8V", Math.abs(o[0] - 1.8) < 0.05],
      ["Vout(Vin=1.8) ~ 0V", Math.abs(o[o.length - 1]) < 0.05],
    ];
  },
  "inverter-tran": (r) => {
    const o = sig(r, "v(out)");
    return [
      ["Vout min < 0.2V", min(o) < 0.2],
      ["Vout max > 1.6V", max(o) > 1.6],
    ];
  },
  "nmos-idvg": (r) => {
    const i = sig(r, "i(vd)").map(Math.abs);
    return [
      ["Id(Vgs=0) < 1uA", i[0] < 1e-6],
      ["Id(Vgs=1.8) > 100uA", i[i.length - 1] > 1e-4],
    ];
  },
  "pmos-idvg": (r) => {
    const i = sig(r, "i(vd)").map(Math.abs);
    return [
      ["Id(off) < 1uA", i[0] < 1e-6],
      ["Id(on) > 20uA", i[i.length - 1] > 2e-5],
    ];
  },
};

let failed = 0;
for (const lesson of LESSONS) {
  sim.setNetList(lesson.netlist);
  const res = await sim.runSim();
  const errs = sim.getError().filter((l) => l.trim());
  let rows;
  try {
    rows = checks[lesson.id](res);
  } catch (e) {
    rows = [[String(e.message), false]];
  }
  const ok = rows.every(([, p]) => p) && errs.length === 0;
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${lesson.title}  (${res.numPoints} titik)`);
  for (const [label, p] of rows) console.log(`        ${p ? "ok " : "BAD"} ${label}`);
  if (errs.length) console.log("        errors:", errs.slice(0, 3).map((l) => l.slice(0, 140)));
}
process.exit(failed ? 1 : 0);
