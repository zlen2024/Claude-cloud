// Rujukan (simulation, Vg=1.0, Vs=0.1, W=3, L=0.5): Rd=10k -> A0 = 12.7 dB, f-3dB = 162 MHz, Vout(DC) = 1.30 V.
// Rd=20k -> A0 = 18.0 dB, f-3dB = 85 MHz, Vout(DC) = 0.84 V (masih saturation: Vds = 0.74 V > Vov ~ 0.2 V).
// Hand calc: Id ~ (1.8-0.84)/20k = 48 uA; gm ~ 2*Id/Vov ~ 2*48u/0.25 ~ 380 uS (+gmb); A0 ~ 380u * 20k ~ 7.6 -> 17.6 dB. Sepadan dengan 18 dB.
export const checks = [
  {
    id: "phase",
    label: "Tak songsang (fasa ≈ 0°)",
    run: (_r, h) => {
      const p = h.phase("v(out)")[0];
      return { pass: Math.abs(p) < 5, actual: `${p.toFixed(0)}°`, expected: "0°" };
    },
    hints: [],
  },
  {
    id: "gain",
    label: "A0 lebih daripada 16 dB",
    run: (_r, h) => {
      const g = h.mag("v(out)")[0];
      return { pass: g > 16, actual: `${g.toFixed(1)} dB`, expected: "> 16 dB" };
    },
    hints: ["A0 ≈ gm · Rd. Apa yang boleh diubah dengan mudah?", "Naikkan Rd kepada 20k."],
  },
  {
    id: "bw",
    label: "f-3dB lebih daripada 50 MHz",
    run: (_r, h) => {
      const f = h.f3db(Array.from(h.x), Array.from(h.mag("v(out)")));
      return { pass: f !== null && f > 50e6, actual: f === null ? "-" : `${(f / 1e6).toFixed(0)} MHz`, expected: "> 50 MHz" };
    },
    hints: [],
  },
];
