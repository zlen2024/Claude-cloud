// Rujukan (simulation, Iss = 20 uA, ib2 = 60 uA, W6 = 7, Cl = 1 pF): A0 = 70.4 dB.
//   Cc=0.1p -> PM 11 deg, fu 91.7 MHz; Cc=1p -> PM 42.0 deg, fu 22.0 MHz; Cc=2p -> PM 51.2, fu 11.9 MHz;
//   Cc=3p -> PM 55.2, fu 8.07 MHz; Cc=4p -> PM 57.3, fu 6.10 MHz; Cc=5p -> PM 58.7, fu 4.89 MHz.
// Hand calc: fu = gm1/(2*pi*Cc) = 140u/(2*pi*4p) = 5.6 MHz (diukur 6.1 MHz). Kutub kedua ~ gm6/(2*pi*Cl): dengan gm6 ~ 500 uS ~ 80 MHz.
// PM ideal ~ 90 - atan(fu/f2) ~ 85 deg, tetapi diukur hanya 57 deg kerana sifar separuh-satah-kanan (laluan Cc) dan kutub bukan-dominan
// lain mengurangkan margin. Ambang 55 deg diambil daripada nilai simulation.
const f = (h) => Array.from(h.x);
export const checks = [
  {
    id: "a0",
    label: "A0 lebih daripada 60 dB",
    run: (_r, h) => {
      const g = h.mag("v(out)")[0];
      return { pass: g > 60, actual: `${g.toFixed(1)} dB`, expected: "> 60 dB" };
    },
    hints: [],
  },
  {
    id: "pm",
    label: "Margin fasa lebih daripada 55°",
    run: (_r, h) => {
      const pm = h.phaseMargin(f(h), Array.from(h.mag("v(out)")), Array.from(h.phase("v(out)")));
      return { pass: pm !== null && pm > 55, actual: pm === null ? "-" : `${pm.toFixed(1)}°`, expected: "> 55°" };
    },
    hints: ["Kutub kedua perlu jauh di atas fu. Bagaimana kapasitor Miller mempengaruhi fu?", "Naikkan Cc. Cuba 4p."],
  },
  {
    id: "fu",
    label: "Frekuensi gandaan unit lebih daripada 5 MHz",
    run: (_r, h) => {
      const fu = h.unityGainFreq(f(h), Array.from(h.mag("v(out)")));
      return { pass: fu !== null && fu > 5e6, actual: fu === null ? "-" : `${(fu / 1e6).toFixed(1)} MHz`, expected: "> 5 MHz" };
    },
    hints: ["Cc terlalu besar menurunkan fu (fu ≈ gm1/(2π Cc))."],
  },
];
