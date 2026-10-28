// Rujukan (simulation, Vgs = 1.0 V, W = 1): ro dari Vds 1.0 -> 1.6 V:
//   L=0.15 -> 39.2 kohm, L=0.5 -> 436 kohm, L=1 -> 889 kohm.
// Hand calc: ro ~ L^2 (lihat lesson): 0.5/0.15 = 3.3 -> 11x (diukur 11.1x). Pada L=1 hanya 22.7x berbanding 44x kerana halaju tepu.
const ro = (h, name) => {
  const i = h.sig(name);
  return (1.6 - 1.0) / (h.valueAt(h.x, i, 1.6) - h.valueAt(h.x, i, 1.0));
};
const kohm = (v) => `${(v / 1e3).toFixed(0)} kΩ`;
export const checks = [
  {
    id: "ro1",
    label: "ro bagi xm1 (L = 0.15) antara 20 kΩ dan 80 kΩ",
    run: (_r, h) => {
      const v = ro(h, "i(vm1)");
      return { pass: v > 20e3 && v < 80e3, actual: kohm(v), expected: "20 - 80 kΩ" };
    },
    hints: [],
  },
  {
    id: "ro2",
    label: "ro xm2 lebih 3 kali ro xm1",
    run: (_r, h) => {
      const r = ro(h, "i(vm2)") / ro(h, "i(vm1)");
      return { pass: r > 3, actual: `${r.toFixed(1)}x`, expected: "> 3x" };
    },
    hints: ["ro bergantung pada L. Apa yang berlaku kalau xm2 dipanjangkan?", "Tukar l=0.15 kepada l=0.5 pada xm2."],
  },
  {
    id: "ro3",
    label: "ro xm3 lebih 5 kali ro xm1",
    run: (_r, h) => {
      const r = ro(h, "i(vm3)") / ro(h, "i(vm1)");
      return { pass: r > 5, actual: `${r.toFixed(1)}x`, expected: "> 5x" };
    },
    hints: ["Gunakan L yang lebih panjang lagi untuk xm3. W = 1 sah untuk semua L."],
  },
];
