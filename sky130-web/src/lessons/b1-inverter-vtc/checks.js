// Rujukan (simulation, VDD=1.8V, L=0.15): VM = 0.831 (Wn=0.42,Wp=0.42), 0.839 (1,1), 0.874 (1,2), 0.894 (1,3), 0.910 (0.42,1).
// Nisbah mobiliti ~2.4 menjangkakan Wp/Wn ~ 2.4 untuk VM tepat di tengah; Wp=3 (bin sah) beri VM = 0.894.
const vm = (h) => {
  const diff = Array.from(h.sig("v(out)"), (v, i) => v - h.x[i]);
  return h.crossing(Array.from(h.x), diff, 0, "falling");
};
export const checks = [
  {
    id: "rails",
    label: "Vout(Vin=0) ≈ 1.8 V dan Vout(Vin=1.8) ≈ 0 V",
    run: (_r, h) => {
      const o = h.sig("v(out)");
      return { pass: Math.abs(o[0] - 1.8) < 0.05 && Math.abs(o[o.length - 1]) < 0.05, actual: `${o[0].toFixed(2)} V / ${o[o.length - 1].toFixed(3)} V`, expected: "1.8 V / 0 V" };
    },
    hints: [],
  },
  {
    id: "vm",
    label: "VM dalam 0.9 V ± 0.04 V",
    run: (_r, h) => {
      const v = vm(h);
      return { pass: v !== null && Math.abs(v - 0.9) < 0.04, actual: v === null ? "-" : `${v.toFixed(3)} V`, expected: "0.86 - 0.94 V" };
    },
    hints: ["VM terlalu rendah bermakna PMOS terlalu lemah. Apa yang menguatkan PMOS?", "Besarkan W PMOS. W = 3 sah."],
  },
];
