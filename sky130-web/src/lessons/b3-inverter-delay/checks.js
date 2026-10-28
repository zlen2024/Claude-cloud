// Rujukan (simulation, Cl=20fF, L=0.15): tpd = 124 ps (0.42/1), 67 ps (1/3), 38 ps (3/7). Dengan Cl=100fF dan 0.42/1: 498 ps.
// Hand calc: tpd ~ 0.69*Ron*C; Ron(0.42um) ~ 8 kohm -> 0.69*8k*20f = 110 ps, sepadan dengan 124 ps.
const tpd = (h) => h.propDelay(Array.from(h.x), Array.from(h.sig("v(in)")), Array.from(h.sig("v(out)")), 0.9);
export const checks = [
  {
    id: "swing",
    label: "Output bergerak penuh (min < 0.2 V, maks > 1.6 V)",
    run: (_r, h) => {
      const o = h.sig("v(out)");
      return { pass: h.min(o) < 0.2 && h.max(o) > 1.6, actual: `${h.min(o).toFixed(2)} - ${h.max(o).toFixed(2)} V`, expected: "< 0.2 V dan > 1.6 V" };
    },
    hints: [],
  },
  {
    id: "tpd",
    label: "tpd kurang daripada 80 ps",
    run: (_r, h) => {
      const d = tpd(h);
      return { pass: d !== null && d < 80e-12, actual: d === null ? "-" : `${(d * 1e12).toFixed(0)} ps`, expected: "< 80 ps" };
    },
    hints: ["Ron berkadar songsang dengan W. Apa yang perlu dibesarkan?", "Cuba Wn = 1 dan Wp = 3 (kedua-duanya bin sah)."],
  },
];
