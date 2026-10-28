// Rujukan (simulation, R = 20k ideal, L = 1, Wp = 3): K=1 -> Iref ~ 0.13 uA (keadaan sifar). K=3 -> Iref(1.8 V) = 3.66 uA, sensitiviti 19 %/V.
// Contoh kontras: perintang 40k + diod NMOS (L = 1) -> sensitiviti ~ 98 %/V.
// Hand calc: I = 2/(beta*R^2)*(1-1/sqrt(K))^2; (1-1/sqrt(3))^2 = 0.179; beta = I*R^2/(2*0.179)... => beta = 3.66u*4e8/0.358 = 4.1 mA/V^2,
// iaitu un*Cox*W/L ~ 4 mA/V^2 mustahil untuk W/L = 1 (un*Cox ~ 0.2 mA/V^2), jadi formula segi empat sama tidak tepat
// (halaju tepu dan inversi sederhana pada arus rendah). Gunakan formula untuk tren sahaja: arus turun bila R naik, naik bila K naik.
const iref = (h) => h.sig("i(vsns)");
export const checks = [
  {
    id: "start",
    label: "Iref pada VDD = 1.8 V antara 2 µA dan 6 µA",
    run: (_r, h) => {
      const i = h.valueAt(h.x, iref(h), 1.8);
      return { pass: i > 2e-6 && i < 6e-6, actual: `${(i * 1e6).toFixed(2)} µA`, expected: "2 - 6 µA" };
    },
    hints: ["Dengan K = 1 hanya arus sifar wujud. Apa yang menjadikan K lebih besar daripada 1?", "Lebarkan xm2 kepada 3 (K = 3)."],
  },
  {
    id: "line",
    label: "Sensitiviti bekalan kurang daripada 30 %/V",
    run: (_r, h) => {
      const i = iref(h);
      const i18 = h.valueAt(h.x, i, 1.8);
      const s = ((h.valueAt(h.x, i, 2.0) - h.valueAt(h.x, i, 1.6)) / i18 / 0.4) * 100;
      return { pass: Math.abs(s) < 30, actual: `${s.toFixed(1)} %/V`, expected: "< 30 %/V" };
    },
    hints: [],
  },
];
