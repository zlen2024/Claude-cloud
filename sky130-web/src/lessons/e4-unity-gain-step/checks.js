// Rujukan (simulation, langkah 0.90 -> 1.00 V, nilai akhir 0.997 V): Cc=0.1p -> lajak 60%, Cc=0.2p -> 51%, Cc=0.5p -> 34%, Cc=1p -> 20%, Cc=2p -> 7.2% (settle ke 1 mV dalam 48 ns).
// Hand calc: lajak dua kutub ~ exp(-pi*zeta/sqrt(1-zeta^2)) dengan zeta ~ PM/100: PM = 51 deg -> ~15%; diukur 7-20% untuk PM 42-51 deg. Sepadan sebagai julat.
// Ralat keadaan mantap = 100 mV / (1 + A0) = 100m/3000 ~ 0.03 mV; diukur 3 mV kerana offset sistematik (ketidakpadanan CLM cermin).
const step = (h) => {
  const t = Array.from(h.x), o = Array.from(h.sig("v(out)"));
  const base = h.valueAt(t, o, 19e-9);
  const fin = h.valueAt(t, o, 1.4e-6);
  let peak = -Infinity;
  let ts = 0;
  for (let i = 0; i < t.length; i++) {
    if (t[i] > 20e-9) {
      peak = Math.max(peak, o[i]);
      if (Math.abs(o[i] - fin) > 1e-3) ts = t[i];
    }
  }
  return { base, fin, peak, overshoot: ((peak - fin) / (fin - base)) * 100, settle: ts - 21e-9 };
};
export const checks = [
  {
    id: "final",
    label: "Nilai akhir dalam 10 mV daripada 1.0 V",
    run: (_r, h) => {
      const s = step(h);
      return { pass: Math.abs(s.fin - 1.0) < 0.01, actual: `${s.fin.toFixed(4)} V`, expected: "1.0 ± 0.01 V" };
    },
    hints: [],
  },
  {
    id: "overshoot",
    label: "Lajak kurang daripada 10%",
    run: (_r, h) => {
      const s = step(h);
      return { pass: s.overshoot < 10, actual: `${s.overshoot.toFixed(1)}%`, expected: "< 10%" };
    },
    hints: ["Lajak besar bermakna margin fasa rendah. Parameter mana dalam pelajaran sebelum ini menaikkan margin fasa?", "Naikkan Cc kepada 2p."],
  },
  {
    id: "settle",
    label: "Penetapan ke 1 mV dalam kurang 100 ns",
    run: (_r, h) => {
      const s = step(h);
      return { pass: s.settle < 100e-9, actual: `${(s.settle * 1e9).toFixed(0)} ns`, expected: "< 100 ns" };
    },
    hints: ["Jangan besarkan Cc terlalu banyak: penetapan menjadi perlahan."],
  },
];
