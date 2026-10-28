// Pengiraan rujukan (simulation + tangan):
// Id(Vgs=1.8V, Vds=50mV) ~ 72 uA untuk W=1, 223 uA untuk W=3. Berkadar dengan W/L (3x lebih lebar -> ~3x arus).
// Vth (ekstrapolasi linear pada Vds=50mV) ~ 0.78 V; ini termasuk offset Vds/2 = 25 mV, jadi Vth sebenar ~ 0.75 V.
export const checks = [
  {
    id: "vth",
    label: "Vth (ekstrapolasi linear) antara 0.55 V dan 0.9 V",
    run: (_r, h) => {
      const vth = h.vthExtrap(Array.from(h.x), Array.from(h.sig("i(vd)"), (v) => -v));
      return { pass: vth !== null && vth > 0.55 && vth < 0.9, actual: vth === null ? "-" : `${vth.toFixed(3)} V`, expected: "0.55 - 0.9 V" };
    },
    hints: ["Pastikan Vds kecil (vd = 0.05) dan sapuan Vgs melepasi Vth."],
  },
  {
    id: "off",
    label: "Id pada Vgs = 0 kurang daripada 1 nA",
    run: (_r, h) => {
      const id = -h.sig("i(vd)")[0];
      return { pass: Math.abs(id) < 1e-9, actual: `${(id * 1e9).toFixed(3)} nA`, expected: "< 1 nA" };
    },
    hints: [],
  },
  {
    id: "drive",
    label: "Id pada Vgs = 1.8 V lebih daripada 150 µA",
    run: (_r, h) => {
      const id = -h.valueAt(h.x, h.sig("i(vd)"), 1.8);
      return { pass: id > 150e-6, actual: `${(id * 1e6).toFixed(1)} µA`, expected: "> 150 µA" };
    },
    hints: ["Arus berkadar dengan W/L. Apa yang perlu diubah pada baris xm1?", "Naikkan W. W = 3 ialah bin yang sah."],
  },
];
