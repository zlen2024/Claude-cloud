// Rujukan (simulation): nisbah Id(1.8)/Id(1.0) pada Vgs=1.8V: L=0.15 -> 1.10, L=0.25 -> 1.054, L=0.5 -> 1.053, L=1 -> 1.051.
// Ambang 1.07 memisahkan L=0.15 (gagal) daripada L>=0.25 (lulus).
const idTop = (h) => {
  const id = Array.from(h.sig("i(vd)"), (v) => -v);
  const [s, e] = h.segments[h.segments.length - 1];
  return { id, s, e };
};
export const checks = [
  {
    id: "curves",
    label: "Lima lengkung (Vgs = 0.6 hingga 1.8 V)",
    run: (_r, h) => ({ pass: h.segments.length === 5, actual: `${h.segments.length}`, expected: "5" }),
    hints: ["Biarkan baris .dc seperti asal: dua sapuan."],
  },
  {
    id: "saturation",
    label: "Id(Vds=1.8)/Id(Vds=1.0) < 1.07 pada Vgs tertinggi",
    run: (_r, h) => {
      const { id, s, e } = idTop(h);
      const x = h.x.slice(s, e), y = id.slice(s, e);
      const ratio = h.valueAt(x, y, 1.8) / h.valueAt(x, y, 1.0);
      return { pass: ratio < 1.07, actual: ratio.toFixed(3), expected: "< 1.07" };
    },
    hints: ["Kecerunan dalam saturation ialah 1/ro. Apa yang menjadikan ro lebih besar?", "Panjangkan saluran: tukar L pada xm1. L = 0.5 sah untuk W = 1."],
  },
];
