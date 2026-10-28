// Hand calc: Id (PMOS, Vsg=1.0, W=3, L=0.5) = Id (NMOS, Vgs=0.613) menetapkan Vout. ro1 || ro2 ~ 300-500 kohm pada Id ~ 15 uA,
// gm ~ 150-200 uS => A0 ~ 50-100 (34-40 dB). Simulation: Vin = 0.6128 V -> A0 = 38.6 dB, f-3dB = 491 kHz, fu = 42 MHz.
// Vin = 0.70 V -> Vout = 0.3 mV (NMOS dalam triode) dan A0 = -48.9 dB.
export const checks = [
  {
    id: "inverting",
    label: "Penguat songsang (fasa frekuensi rendah ≈ 180°)",
    run: (_r, h) => {
      const p = Math.abs(h.phase("v(out)")[0]);
      return { pass: Math.abs(p - 180) < 5, actual: `${p.toFixed(0)}°`, expected: "180°" };
    },
    hints: [],
  },
  {
    id: "gain",
    label: "A0 lebih daripada 35 dB",
    run: (_r, h) => {
      const g = h.mag("v(out)")[0];
      return { pass: g > 35, actual: `${g.toFixed(1)} dB`, expected: "> 35 dB" };
    },
    hints: ["Gandaan tinggi hanya jika Vout berada di tengah dan kedua-dua transistor dalam saturation. Di mana Vout sekarang?", "Sapu Vin (.dc vin 0.5 1.0 0.0005) dan cari Vin di mana v(out) = 0.9 V. Ia kira-kira 0.61 V."],
  },
  {
    id: "pole",
    label: "f-3dB kurang daripada 3 MHz dan fu lebih daripada 10 MHz",
    run: (_r, h) => {
      const f = Array.from(h.x), m = Array.from(h.mag("v(out)"));
      const f3 = h.f3db(f, m), fu = h.unityGainFreq(f, m);
      return { pass: f3 !== null && fu !== null && f3 < 3e6 && fu > 10e6, actual: `f-3dB = ${f3 === null ? "-" : (f3 / 1e6).toFixed(2) + " MHz"}, fu = ${fu === null ? "-" : (fu / 1e6).toFixed(1) + " MHz"}`, expected: "f-3dB < 3 MHz, fu > 10 MHz" };
    },
    hints: [],
  },
];
