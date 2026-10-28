// Rujukan (simulation, Iss = 20 uA, L = 0.5, Cl = 1 pF): W1=1 -> A0 = 32.0 dB, fu = 14.3 MHz; W1=3 -> A0 = 36.1 dB, fu = 22.7 MHz, PM ~ 90.
// Hand calc: gm1 pada Id = 10 uA, gm/Id ~ 14 /V (W=3, lihat A4) -> gm = 140 uS; fu = gm/(2*pi*Cl) = 140u/(2*pi*1p) = 22 MHz. Sepadan dengan 22.7 MHz.
const f = (h) => Array.from(h.x);
export const checks = [
  {
    id: "gain",
    label: "A0 lebih daripada 35 dB",
    run: (_r, h) => {
      const g = h.mag("v(out)")[0];
      return { pass: g > 35, actual: `${g.toFixed(1)} dB`, expected: "> 35 dB" };
    },
    hints: ["A0 = gm1 · (ro2 ∥ ro4). Menaikkan gm1 pada arus tetap memerlukan W/L lebih besar.", "Naikkan W xm1 dan xm2 kepada 3."],
  },
  {
    id: "fu",
    label: "Frekuensi gandaan unit lebih daripada 20 MHz",
    run: (_r, h) => {
      const fu = h.unityGainFreq(f(h), Array.from(h.mag("v(out)")));
      return { pass: fu !== null && fu > 20e6, actual: fu === null ? "-" : `${(fu / 1e6).toFixed(1)} MHz`, expected: "> 20 MHz" };
    },
    hints: [],
  },
  {
    id: "pm",
    label: "Margin fasa lebih daripada 60° (satu kutub)",
    run: (_r, h) => {
      const pm = h.phaseMargin(f(h), Array.from(h.mag("v(out)")), Array.from(h.phase("v(out)")));
      return { pass: pm !== null && pm > 60, actual: pm === null ? "-" : `${pm.toFixed(1)}°`, expected: "> 60°" };
    },
    hints: [],
  },
];
