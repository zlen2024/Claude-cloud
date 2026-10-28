// Fungsi ukuran tulen untuk keputusan simulation. x, y ialah array (atau typed array) sama panjang.

const lerp = (x0, y0, x1, y1, y) => (y1 === y0 ? x0 : x0 + ((y - y0) / (y1 - y0)) * (x1 - x0));

/** Semua titik x di mana y melintasi `level`. edge: "rising" | "falling" | "any". */
export function crossings(x, y, level, edge = "any") {
  const out = [];
  for (let i = 1; i < x.length; i++) {
    const a = y[i - 1] - level;
    const b = y[i] - level;
    const rising = a < 0 && b >= 0;
    const falling = a > 0 && b <= 0;
    if ((rising && edge !== "falling") || (falling && edge !== "rising")) {
      out.push(lerp(x[i - 1], y[i - 1], x[i], y[i], level));
    }
  }
  return out;
}

/** x pertama di mana y melintasi level, atau null. */
export function crossing(x, y, level, edge = "any", after = -Infinity) {
  return crossings(x, y, level, edge).find((v) => v > after) ?? null;
}

/** Nilai y pada x0 (interpolasi linear). null kalau di luar julat. Menyokong x menaik atau menurun. */
export function valueAt(x, y, x0) {
  for (let i = 1; i < x.length; i++) {
    const lo = Math.min(x[i - 1], x[i]);
    const hi = Math.max(x[i - 1], x[i]);
    if (x0 >= lo && x0 <= hi) {
      if (x[i] === x[i - 1]) return y[i];
      return y[i - 1] + ((x0 - x[i - 1]) / (x[i] - x[i - 1])) * (y[i] - y[i - 1]);
    }
  }
  return null;
}

export const max = (a) => a.reduce((m, v) => (v > m ? v : m), -Infinity);
export const min = (a) => a.reduce((m, v) => (v < m ? v : m), Infinity);

/** Kecerunan dy/dx pada x0 (beza terpusat merentasi titik jiran). null kalau di luar julat. */
export function slope(x, y, x0) {
  if (x.length < 2) return null;
  let k = -1;
  for (let i = 1; i < x.length; i++) {
    if (x0 >= Math.min(x[i - 1], x[i]) && x0 <= Math.max(x[i - 1], x[i])) {
      k = i;
      break;
    }
  }
  if (k < 0) return null;
  const a = Math.max(0, k - 2);
  const b = Math.min(x.length - 1, k + 1);
  return (y[b] - y[a]) / (x[b] - x[a]);
}

/** Masa naik dari `lo` ke `hi` (nilai mutlak) pada pinggir naik pertama. null kalau tiada. */
export function riseTime(x, y, lo, hi) {
  const t1 = crossing(x, y, lo, "rising");
  if (t1 === null) return null;
  const t2 = crossing(x, y, hi, "rising", t1);
  return t2 === null ? null : t2 - t1;
}

/** Kelewatan perambatan: dari vin melintas `level` ke vout melintas `level` selepas itu. */
export function propDelay(x, vin, vout, level) {
  const tin = crossing(x, vin, level, "any");
  if (tin === null) return null;
  const tout = crossing(x, vout, level, "any", tin);
  return tout === null ? null : tout - tin;
}

/** Magnitud (nombor atau {real,img}) kepada dB. */
export function gainDb(v) {
  const m = typeof v === "number" ? Math.abs(v) : Math.hypot(v.real, v.img);
  return 20 * Math.log10(m);
}

/** Frekuensi di mana gandaan jatuh 3 dB di bawah nilai pertama (frekuensi rendah). Interpolasi dalam log f. */
export function f3db(freq, magDb) {
  const f = crossing(freq.map(Math.log10), magDb, magDb[0] - 3, "falling");
  return f === null ? null : 10 ** f;
}

/** Frekuensi gandaan unit (0 dB, jatuh). null kalau tak melintas. */
export function unityGainFreq(freq, magDb) {
  const f = crossing(freq.map(Math.log10), magDb, 0, "falling");
  return f === null ? null : 10 ** f;
}

/** Buka lilitan fasa (darjah) supaya tiada lompatan > 180. */
export function unwrapDeg(phase) {
  const out = Array.from(phase);
  let off = 0;
  for (let i = 1; i < out.length; i++) {
    const d = phase[i] - phase[i - 1];
    if (d > 180) off -= 360 * Math.round(d / 360);
    else if (d < -180) off -= 360 * Math.round(d / 360);
    out[i] = phase[i] + off;
  }
  return out;
}

/**
 * Margin fasa (darjah) bagi gelung terbuka: 180 + (fasa(fu) - fasa(frekuensi terendah)).
 * Fasa DC dijadikan rujukan, jadi amplifier songsang dan tak songsang kedua-duanya dikendalikan
 * (anggap gelung maklum balas negatif menambah 180 darjah tersendiri). null kalau tiada fu.
 */
export function phaseMargin(freq, magDb, phaseDeg) {
  const fu = unityGainFreq(freq, magDb);
  if (fu === null) return null;
  const ph = unwrapDeg(phaseDeg);
  const lf = freq.map(Math.log10);
  const p = valueAt(lf, ph, Math.log10(fu));
  return 180 + (p - ph[0]);
}

/**
 * Vth dengan kaedah ekstrapolasi linear: tangen pada titik gm maksimum, dipotong pada Id = 0.
 * vgs menaik, id positif (arus magnitud). null kalau data tak cukup.
 */
export function vthExtrap(vgs, id) {
  if (vgs.length < 3) return null;
  let best = -1, gmMax = 0;
  for (let i = 1; i < vgs.length - 1; i++) {
    const gm = (id[i + 1] - id[i - 1]) / (vgs[i + 1] - vgs[i - 1]);
    if (gm > gmMax) { gmMax = gm; best = i; }
  }
  if (best < 0) return null;
  return vgs[best] - id[best] / gmMax;
}
