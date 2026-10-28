// Rujukan (simulation, Vds = 0.9 V, L = 0.5): gm/Id maksimum ~ 30 /V untuk semua W (inversi lemah).
// Hand calc: 1/(n*UT) = 1/(1.3 * 0.0259) = 29.7 /V, n ~ 1.3. Sepadan.
// gm/Id pada Id = 10 uA: W=1 -> 9.1, W=3 -> 14.3, W=7 -> 18.3 /V (gm = 94, 150, 191 uS).
const gmid = (h) => {
  const id = Array.from(h.sig("i(vd)"), (v) => -v);
  const gm = h.deriv(Float64Array.from(id));
  return { id, gm, r: gm.map((g, i) => g / id[i]) };
};
export const checks = [
  {
    id: "peak",
    label: "gm/Id maksimum antara 25 dan 35 /V (inversi lemah)",
    run: (_r, h) => {
      const { r, id } = gmid(h);
      let m = 0;
      for (let i = 2; i < r.length; i++) if (id[i] > 1e-9 && r[i] > m) m = r[i];
      return { pass: m > 25 && m < 35, actual: `${m.toFixed(1)} /V`, expected: "25 - 35 /V" };
    },
    hints: [],
  },
  {
    id: "gmid10",
    label: "gm/Id pada Id = 10 µA lebih daripada 15 /V",
    run: (_r, h) => {
      const { id, gm } = gmid(h);
      const k = id.findIndex((v) => v >= 10e-6);
      const v = k < 0 ? 0 : gm[k] / id[k];
      return { pass: v > 15, actual: `${v.toFixed(1)} /V`, expected: "> 15 /V" };
    },
    hints: ["Untuk arus tetap, W/L yang lebih besar membawa transistor ke inversi yang lebih lemah.", "Naikkan W. W = 7 ialah bin yang sah untuk L = 0.5."],
  },
];
