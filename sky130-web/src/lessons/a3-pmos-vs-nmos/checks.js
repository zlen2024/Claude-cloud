// Rujukan (simulation): pada |Vgs|=1.8V, L=0.15, In(W=1) = 508 uA. Ip: W=1 -> 210 uA (nisbah 0.41), W=3 -> 649 uA (1.28), W=5 -> 1093 uA.
// Jadi mobiliti elektron/lubang ~ 2.4. W=2 (bin sah) beri ~ 0.83, dalam julat 0.75-1.25; W=3 hanya terlepas (1.28).
const ratioAt = (h) => {
  const ip = Math.abs(h.valueAt(h.x, h.sig("i(vdp)"), 1.8));
  const inn = Math.abs(h.valueAt(h.x, h.sig("i(vdn)"), 1.8));
  return { ip, inn, r: ip / inn };
};
export const checks = [
  {
    id: "nmos-on",
    label: "NMOS mengalirkan lebih 300 µA pada Vgs = 1.8 V",
    run: (_r, h) => {
      const { inn } = ratioAt(h);
      return { pass: inn > 300e-6, actual: `${(inn * 1e6).toFixed(0)} µA`, expected: "> 300 µA" };
    },
    hints: [],
  },
  {
    id: "ratio",
    label: "Ip / In antara 0.75 dan 1.25",
    run: (_r, h) => {
      const { r } = ratioAt(h);
      return { pass: r > 0.75 && r < 1.25, actual: r.toFixed(2), expected: "0.75 - 1.25" };
    },
    hints: ["Nisbah arus untuk W sama ialah kira-kira 0.4. Berapa kali W PMOS perlu dibesarkan?", "Cuba W PMOS = 2 (bin sah untuk L = 0.15)."],
  },
];
