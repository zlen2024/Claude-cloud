// Rujukan (simulation, Iref = 20 uA, L = 0.5): asas -> ro(Vo 1.4-1.7) = 729 kohm; cascode -> ~ 29.6 Mohm (Iout/Iref = 0.999).
// Hand calc: ro_cascode ~ gm4*ro4*ro2 = (~150 uS)*(~700k)*(~700k) ~ 70 Mohm, sama susunan dengan 29.6 Mohm (arus kecil menyukarkan ukuran kecerunan; ambang 5 Mohm jauh di bawah).
const iout = (h) => Array.from(h.sig("i(vo)"), (v) => -v);
export const checks = [
  {
    id: "ratio",
    label: "Iout(Vo = 1.5 V) dalam ±5% Iref",
    run: (_r, h) => {
      const r = h.valueAt(h.x, iout(h), 1.5) / 20e-6;
      return { pass: r > 0.95 && r < 1.05, actual: `${r.toFixed(3)} × Iref`, expected: "0.95 - 1.05" };
    },
    hints: [],
  },
  {
    id: "ro",
    label: "Rintangan keluaran (Vo 1.4 - 1.7 V) lebih daripada 5 MΩ",
    run: (_r, h) => {
      const i = iout(h);
      const di = h.valueAt(h.x, i, 1.7) - h.valueAt(h.x, i, 1.4);
      const ro = di > 0 ? 0.3 / di : Infinity;
      return { pass: ro > 5e6, actual: ro === Infinity ? "∞" : `${(ro / 1e6).toFixed(2)} MΩ`, expected: "> 5 MΩ" };
    },
    hints: ["Cermin asas hanya ada ro xm2. Bagaimana menyembunyikan ro itu daripada Vo?", "Letakkan satu transistor (xm4) di atas xm2 dengan gate pada nod diod yang dibias oleh xm3 di atas xm1. Lihat penyelesaian."],
  },
];
