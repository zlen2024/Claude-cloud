// Rujukan (simulation, Iss = 100 uA, W=3, L=0.5, Vcm=0.9): Rd=4k -> gandaan 1.46, |Vd| maks 0.36; Rd=10k -> gandaan 3.56, |Vd| maks 0.88.
// Hand calc: gm ~ 3.56/10k = 356 uS pada Id = 50 uA (gm/Id = 7.1 /V, inversi kuat), jadi Av = gm*Rd = 3.56. Had tepu = Iss*Rd = 1.0 V (0.88 dicapai dalam julat sapuan).
const diff = (h) => Float64Array.from(h.sig("v(o2)"), (v, i) => v - h.sig("v(o1)")[i]);
export const checks = [
  {
    id: "balanced",
    label: "Seimbang: Vo2 - Vo1 = 0 pada Vin1 = Vin2 (±20 mV)",
    run: (_r, h) => {
      const v = h.valueAt(h.x, diff(h), 0.9);
      return { pass: Math.abs(v) < 0.02, actual: `${(v * 1e3).toFixed(1)} mV`, expected: "0 ± 20 mV" };
    },
    hints: [],
  },
  {
    id: "gain",
    label: "Gandaan pembeza (kecerunan pada 0.9 V) lebih daripada 3",
    run: (_r, h) => {
      const g = h.slope(Array.from(h.x), Array.from(diff(h)), 0.9);
      return { pass: g > 3, actual: g.toFixed(2), expected: "> 3" };
    },
    hints: ["Av = gm · Rd. Gm ditetapkan oleh Iss dan saiz. Apa lagi yang menentukan gandaan?", "Naikkan Rd kepada 10k."],
  },
  {
    id: "limit",
    label: "Tidak melebihi had tepu Iss · Rd",
    run: (_r, h) => {
      const rd = Number(/^rd1\s+\S+\s+\S+\s+(\S+)/im.exec(h.netlist)?.[1].replace(/k$/i, "e3"));
      const m = h.max(Array.from(diff(h), Math.abs));
      return { pass: m <= 1e-4 * rd * 1.02, actual: `${m.toFixed(2)} V`, expected: `≤ ${(1e-4 * rd).toFixed(2)} V` };
    },
    hints: [],
  },
];
