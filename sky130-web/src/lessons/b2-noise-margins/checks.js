// Rujukan (simulation, VDD=1.8, L=0.15, Wn=1): Wp=1 -> VIL=0.703, VIH=0.939, VOH=1.752, VOL=0.069 => NML=0.634, NMH=0.812 (beza 0.178).
// Wp=3 -> VIL=0.765, VIH=1.017, VOH=1.747, VOL=0.073 => NML=0.692, NMH=0.730 (beza 0.038).
// Hand calc: gandaan puncak |Av| ~ 11-14 pada VM, jadi VIH-VIL ~ VDD/|Av| ~ 0.15-0.25, sepadan dengan 0.24-0.25 yang diukur.
const margins = (h) => {
  const x = Array.from(h.x), o = Array.from(h.sig("v(out)"));
  const g = Array.from(h.deriv(Float64Array.from(o)));
  const vil = h.crossing(x, g, -1, "falling");
  const vih = h.crossing(x, g, -1, "rising");
  if (vil === null || vih === null) return null;
  const voh = h.valueAt(x, o, vil), vol = h.valueAt(x, o, vih);
  return { vil, vih, nml: vil - vol, nmh: voh - vih, gmax: Math.min(...g) };
};
export const checks = [
  {
    id: "gain",
    label: "Gandaan puncak |Av| lebih daripada 5",
    run: (_r, h) => {
      const m = margins(h);
      return { pass: !!m && -m.gmax > 5, actual: m ? `${(-m.gmax).toFixed(1)}` : "-", expected: "> 5" };
    },
    hints: [],
  },
  {
    id: "balance",
    label: "|NMH - NML| kurang daripada 0.1 V",
    run: (_r, h) => {
      const m = margins(h);
      if (!m) return { pass: false, actual: "-", expected: "< 0.1 V" };
      return { pass: Math.abs(m.nmh - m.nml) < 0.1, actual: `NML = ${m.nml.toFixed(3)} V, NMH = ${m.nmh.toFixed(3)} V`, expected: "beza < 0.1 V" };
    },
    hints: ["NMH lebih besar daripada NML bermakna PMOS terlalu lemah. Bagaimana menguatkannya?", "Besarkan W PMOS kepada 3."],
  },
];
