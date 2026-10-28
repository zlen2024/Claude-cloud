// Hand calc (Vin=0.8V): Id = (1.8 - Vout)/Rd. Rd=20k: Vout=1.29V -> Id=25.5uA, gm ~ 2Id/Vov ~ 170uS (Vov ~ 0.3V).
// A0 ~ gm*(Rd||ro) ~ 4-6 (12-16 dB). Simulation: Rd=20k -> 13.98 dB, f-3dB = 81 MHz; Rd=50k -> 20.7 dB, f-3dB = 35.7 MHz.
// f-3dB = 1/(2*pi*(Rd||ro)*Cl) = 1/(2*pi*~15k*100f) ~ 100 MHz untuk 20k, sepadan dengan 81 MHz.
export const checks = [
  {
    id: "inverting",
    label: "Fasa frekuensi rendah ≈ 180° (penguat songsang)",
    run: (_r, h) => {
      const p = Math.abs(h.phase("v(out)")[0]);
      return { pass: Math.abs(p - 180) < 5, actual: `${p.toFixed(0)}°`, expected: "180°" };
    },
    hints: [],
  },
  {
    id: "gain",
    label: "Gandaan frekuensi rendah lebih daripada 18 dB",
    run: (_r, h) => {
      const g = h.mag("v(out)")[0];
      return { pass: g > 18, actual: `${g.toFixed(1)} dB`, expected: "> 18 dB" };
    },
    hints: ["A0 = gm · (Rd ∥ ro). Pembolehubah mana yang boleh anda ubah dengan mudah?", "Naikkan Rd. Cuba 50k."],
  },
  {
    id: "bandwidth",
    label: "f-3dB lebih daripada 20 MHz",
    run: (_r, h) => {
      const f = h.f3db(Array.from(h.x), Array.from(h.mag("v(out)")));
      return { pass: f !== null && f > 20e6, actual: f === null ? "-" : `${(f / 1e6).toFixed(1)} MHz`, expected: "> 20 MHz" };
    },
    hints: ["Rd terlalu besar menurunkan lebar jalur: f-3dB ~ 1/(2π Rd Cl)."],
  },
];
