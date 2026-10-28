// Rujukan (simulation, Vin=1.5V DC, L=0.5): W=3,RL=5k -> 0.626 (-4.07 dB); W=3,RL=20k -> 0.741; W=7,RL=20k -> 0.777;
// W=3,RL=100k -> 0.794; W=7,RL=100k -> 0.807 (f-3dB = 257 MHz).
// Hand calc: gm*RL' >> 1 memberi 1/(1+gmb/gm + 1/(gm RL')): dengan gmb/gm ~ 0.2 had atas ~ 0.83, sepadan dengan 0.807.
const gain = (h) => 10 ** (h.mag("v(out)")[0] / 20);
export const checks = [
  {
    id: "phase",
    label: "Tidak songsang (fasa ≈ 0°)",
    run: (_r, h) => {
      const p = h.phase("v(out)")[0];
      return { pass: Math.abs(p) < 5, actual: `${p.toFixed(0)}°`, expected: "0°" };
    },
    hints: [],
  },
  {
    id: "gain",
    label: "Gandaan linear lebih daripada 0.78 (dan kurang daripada 1)",
    run: (_r, h) => {
      const g = gain(h);
      return { pass: g > 0.78 && g < 1, actual: g.toFixed(3), expected: "0.78 - 1" };
    },
    hints: ["Gandaan ≈ gm·RL'/(1 + gm·RL'). Apa yang menaikkan gm dan RL'?", "Naikkan RL kepada 100k dan W kepada 7."],
  },
  {
    id: "bw",
    label: "f-3dB lebih daripada 100 MHz",
    run: (_r, h) => {
      const f = h.f3db(Array.from(h.x), Array.from(h.mag("v(out)")));
      return { pass: f !== null && f > 100e6, actual: f === null ? "-" : `${(f / 1e6).toFixed(0)} MHz`, expected: "> 100 MHz" };
    },
    hints: [],
  },
];
