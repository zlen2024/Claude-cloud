// Rujukan (simulation, Wn=1, Wp=3, L=0.15, 5 fF/nod): N=3 -> 4.78 GHz, N=5 -> 2.82 GHz, N=7 -> 2.01 GHz.
// Hand calc: f ~ 1/(2 N tpd) -> tpd = 1/(2*5*2.82G) = 35 ps. Sepadan dengan tpd inverter 1/3 (67 ps untuk 20 fF; ~ 35 ps untuk beban ~ 10 fF).
const measure = (h) => {
  const t = Array.from(h.x), v = Array.from(h.sig("v(n1)"));
  const cr = h.crossings(t, v, 0.9, "rising").filter((x) => x > 5e-9);
  if (cr.length < 3) return { f: null, cycles: cr.length };
  return { f: 1 / ((cr[cr.length - 1] - cr[0]) / (cr.length - 1)), cycles: cr.length };
};
export const checks = [
  {
    id: "oscillates",
    label: "Ayunan penuh (lebih 10 kitaran selepas 5 ns, ayunan > 1.6 V)",
    run: (_r, h) => {
      const m = measure(h);
      const v = Array.from(h.sig("v(n1)")).filter((_, i) => h.x[i] > 5e-9);
      const sw = h.max(v) - h.min(v);
      return { pass: m.cycles > 10 && sw > 1.6, actual: `${m.cycles} cycles, ${sw.toFixed(2)} V`, expected: "> 10 cycles, > 1.6 V" };
    },
    hints: [],
  },
  {
    id: "freq",
    label: "Frekuensi antara 2 GHz dan 3.5 GHz",
    run: (_r, h) => {
      const f = measure(h).f;
      return { pass: f !== null && f > 2e9 && f < 3.5e9, actual: f === null ? "-" : `${(f / 1e9).toFixed(2)} GHz`, expected: "2 - 3.5 GHz" };
    },
    hints: ["f ~ 1/(2 N tpd). Frekuensi 3 peringkat terlalu tinggi, jadi N perlu bertambah.", "Gunakan 5 peringkat: tambah dua inverter dan sambung gelung n5 -> n1."],
  },
];
