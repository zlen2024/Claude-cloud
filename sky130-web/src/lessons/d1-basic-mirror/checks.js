// Rujukan (simulation, Iref = 20 uA, L = 0.5): W2=1 -> Iout(0.9)/Iref = 0.999, ro = 624 kohm; W2=3 -> 2.957, ro = 265 kohm.
// Hand calc: nisbah = W2/W1 = 3, ralat 1.4% datang dari Vds xm2 (0.9 V) berbeza daripada Vds xm1 (Vgs = 0.906 V) dan CLM.
// ro turun bila Id naik (ro ~ 1/(lambda*Id)): 624k/3 = 208k dijangka, 265k diukur.
// Dengan L = 0.15: nisbah 3.79 dan ro = 24 kohm. L pendek memburukkan padanan dan ro.
const iout = (h) => Array.from(h.sig("i(vo)"), (v) => -v);
export const checks = [
  {
    id: "ratio",
    label: "Iout(Vo = 0.9 V) = 3 × Iref ± 10%",
    run: (_r, h) => {
      const r = h.valueAt(h.x, iout(h), 0.9) / 20e-6;
      return { pass: r > 2.7 && r < 3.3, actual: `${r.toFixed(2)} × Iref`, expected: "2.7 - 3.3" };
    },
    hints: ["Iout = Iref · (W2/L2)/(W1/L1). Apa yang perlu diubah untuk nisbah 3?", "Tukar W xm2 kepada 3."],
  },
  {
    id: "ro",
    label: "Rintangan keluaran (Vo 0.8 - 1.6 V) lebih daripada 150 kΩ",
    run: (_r, h) => {
      const i = iout(h);
      const ro = 0.8 / (h.valueAt(h.x, i, 1.6) - h.valueAt(h.x, i, 0.8));
      return { pass: ro > 150e3, actual: `${(ro / 1e3).toFixed(0)} kΩ`, expected: "> 150 kΩ" };
    },
    hints: [],
  },
];
