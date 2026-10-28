// Menjalankan checks.js sesuatu lesson terhadap keputusan simulation.
import { buildSignals } from "./signals.js";
import * as measure from "./measure.js";

export function makeHelpers(result, netlist) {
  const built = buildSignals(result, netlist);
  const byName = (name) => {
    const s = built.signals.find((x) => x.name.toLowerCase() === name.toLowerCase());
    if (!s) throw new Error(`Isyarat ${name} tiada. Ada: ${built.signals.map((x) => x.name).join(", ")}`);
    return s;
  };
  return {
    ...measure,
    built,
    netlist,
    x: built.x,
    segments: built.segments,
    /** Isyarat real (Float64Array). */
    sig: (name) => byName(name).values,
    /** Gandaan AC (dB) dan fasa (darjah). */
    mag: (name) => byName(name).mag,
    phase: (name) => byName(name).phase,
    /** dy/dx (beza terpusat, ikut segmen sapuan). */
    deriv: (y) => {
      const out = new Float64Array(y.length);
      for (const [a, b] of built.segments) {
        for (let i = a; i < b; i++) {
          const lo = Math.max(a, i - 1), hi = Math.min(b - 1, i + 1);
          out[i] = hi === lo ? 0 : (y[hi] - y[lo]) / (built.x[hi] - built.x[lo]);
        }
      }
      return out;
    },
    /** Nilai sapuan luar bagi segmen k (daripada label "vg = 0.6"). */
    segValue: (k) => Number(/=\s*(.+)$/.exec(built.segLabels[k])?.[1]),
  };
}

/** @returns {{id,label,pass,actual,expected,hints}[]} */
export function runChecks(checks, result, netlist) {
  const h = makeHelpers(result, netlist);
  return checks.map((c) => {
    try {
      const r = c.run(result, h);
      return { id: c.id, label: c.label, hints: c.hints ?? [], pass: !!r.pass, actual: r.actual, expected: r.expected };
    } catch (e) {
      return { id: c.id, label: c.label, hints: c.hints ?? [], pass: false, actual: `ralat: ${e.message}`, expected: "" };
    }
  });
}
