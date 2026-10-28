// Bantu tukar keputusan engine kepada isyarat yang boleh diplot.

export const unitOf = (name) => (/^v\(/i.test(name) ? "V" : /^i\(/i.test(name) ? "A" : "");

/** Pecahkan x kepada segmen bila arah sapuan terbalik (sapuan .dc bersarang). Pulang [[start,end),...]. */
export function splitSegments(x) {
  const n = x.length;
  if (n < 3) return [[0, n]];
  let dir = 0;
  for (let i = 1; i < n && dir === 0; i++) dir = Math.sign(x[i] - x[i - 1]);
  if (dir === 0) return [[0, n]];
  const segs = [];
  let start = 0;
  for (let i = 1; i < n; i++) {
    if ((x[i] - x[i - 1]) * dir < 0) {
      segs.push([start, i]);
      start = i;
    }
  }
  segs.push([start, n]);
  return segs;
}

const SI = { t: 1e12, g: 1e9, meg: 1e6, k: 1e3, m: 1e-3, u: 1e-6, n: 1e-9, p: 1e-12, f: 1e-15 };
export function parseSpiceNumber(s) {
  const m = /^([+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)(meg|[tgkmunpf])?/i.exec(String(s).trim());
  if (!m) return NaN;
  return parseFloat(m[1]) * (m[2] ? SI[m[2].toLowerCase()] : 1);
}

/** Baca baris .dc dan pulang [{src,start,stop,step}] (sapuan pertama = dalam, terakhir = luar). */
export function parseDcSweeps(netlist) {
  const line = netlist.split(/\r?\n/).find((l) => /^\s*\.dc\b/i.test(l));
  if (!line) return [];
  const t = line.trim().split(/\s+/).slice(1);
  const out = [];
  for (let i = 0; i + 4 <= t.length; i += 4) {
    const [src, a, b, c] = t.slice(i, i + 4);
    out.push({ src, start: parseSpiceNumber(a), stop: parseSpiceNumber(b), step: parseSpiceNumber(c) });
  }
  return out;
}

/** Label setiap segmen berdasarkan sapuan luar, contoh "vg = 0.6". */
export function segmentLabels(netlist, count) {
  const sw = parseDcSweeps(netlist);
  if (count <= 1 || sw.length < 2) return Array.from({ length: count }, () => "");
  const o = sw[sw.length - 1];
  return Array.from({ length: count }, (_, k) => {
    const v = o.start + k * o.step;
    return `${o.src} = ${Number(v.toPrecision(4))}`;
  });
}

const hidden = (name) => name.includes("#");

/**
 * Tukar keputusan engine kepada {kind, x, xLabel, xLog, signals, segments}.
 * kind "real": signals[].values Float64Array. kind "ac": x = frekuensi (Hz), signals[] ada mag (dB) dan phase (darjah).
 */
export function buildSignals(res, netlist = "") {
  const xd = res.data[0];
  if (res.dataType === "complex") {
    const x = Float64Array.from(xd.values, (c) => c.real);
    const signals = res.data
      .slice(1)
      .filter((d) => !hidden(d.name))
      .map((d) => {
        const mag = Float64Array.from(d.values, (c) => 20 * Math.log10(Math.hypot(c.real, c.img)));
        const raw = Array.from(d.values, (c) => (Math.atan2(c.img, c.real) * 180) / Math.PI);
        return { name: d.name, unit: unitOf(d.name), mag, phase: Float64Array.from(unwrap(raw)) };
      });
    return { kind: "ac", x, xLabel: "frekuensi (Hz)", xLog: true, signals, segments: [[0, x.length]], segLabels: [""] };
  }
  const x = xd.values instanceof Float64Array ? xd.values : Float64Array.from(xd.values);
  const isDc = /^\s*\.dc\b/im.test(netlist);
  const segments = isDc ? splitSegments(x) : [[0, x.length]];
  const signals = res.data
    .slice(1)
    .filter((d) => !hidden(d.name))
    .map((d) => ({ name: d.name, unit: unitOf(d.name), values: d.values }));
  return {
    kind: "real", x, xLabel: xd.name, xLog: false, signals, segments,
    segLabels: segmentLabels(netlist, segments.length),
  };
}

function unwrap(deg) {
  const out = deg.slice();
  let off = 0;
  for (let i = 1; i < deg.length; i++) {
    const d = deg[i] - deg[i - 1];
    if (Math.abs(d) > 180) off -= 360 * Math.round(d / 360);
    out[i] = deg[i] + off;
  }
  return out;
}

/** Anggaran unit bagi isyarat terbitan: sama dengan unit semua rujukan jika hanya + - abs; selain itu "". */
export function inferUnit(src, signals) {
  if (/[*/^]|deriv|db\(|sqrt|ln\(|log10/i.test(src)) return "";
  const used = signals.filter((s) => src.toLowerCase().includes(s.name.toLowerCase()));
  const units = new Set(used.map((s) => s.unit));
  return units.size === 1 ? [...units][0] : "";
}

/** CSV bagi isyarat yang kelihatan. */
export function toCsv(xLabel, x, series) {
  const rows = [[xLabel, ...series.map((s) => s.name)].join(",")];
  for (let i = 0; i < x.length; i++) rows.push([x[i], ...series.map((s) => s.values[i])].join(","));
  return rows.join("\n") + "\n";
}
