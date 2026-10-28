// Plot canvas (tanpa library): dua paksi Y, panel bertindan (Bode), segmen sapuan bersarang,
// zoom (roda), pan (seret), dua kursor, eksport PNG.

// palet yang jelas pada latar gelap dan terang
const PALETTE = ["#2f7ddf", "#e08a00", "#16a34a", "#db2777", "#7c5cdb", "#dc2626", "#0891b2", "#a16207"];
export const colorFor = (i) => PALETTE[i % PALETTE.length];

const SI = [
  [1e9, "G"], [1e6, "M"], [1e3, "k"], [1, ""],
  [1e-3, "m"], [1e-6, "µ"], [1e-9, "n"], [1e-12, "p"], [1e-15, "f"],
];

export function fmt(v) {
  if (!Number.isFinite(v)) return "NaN";
  if (v === 0) return "0";
  const a = Math.abs(v);
  const [scale, prefix] = SI.find(([s]) => a >= s * 0.9999) ?? SI[SI.length - 1];
  return `${Number((v / scale).toPrecision(3))}${prefix}`;
}

export function niceStep(range, target) {
  const raw = range / target;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const n = raw / mag;
  const f = n < 1.5 ? 1 : n < 3 ? 2 : n < 7 ? 5 : 10;
  return f * mag;
}

import { t } from "./i18n/index.js";

const MONO = "12px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
const css = (name, fallback) => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;

export class Plot {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.data = null;
    this.view = null; // {x0, x1} dalam unit data
    this.hoverX = null; // piksel
    this.hoverY = null;
    this.cursors = { A: null, B: null };
    this.onCursors = null;
    this.layout = null;
    this.drag = null;
    this._bind();
    new ResizeObserver(() => this.draw()).observe(canvas);
  }

  _px(e) {
    const r = this.canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  _bind() {
    const c = this.canvas;
    c.addEventListener("mousemove", (e) => {
      const p = this._px(e);
      if (this.drag) return this._dragMove(p);
      this.hoverX = p.x;
      this.hoverY = p.y;
      c.style.cursor = this._hitCursor(p.x) ? "ew-resize" : "crosshair";
      this.draw();
    });
    c.addEventListener("mouseleave", () => {
      this.hoverX = this.hoverY = null;
      this.draw();
    });
    c.addEventListener("mousedown", (e) => {
      if (!this.layout) return;
      const p = this._px(e);
      const cur = this._hitCursor(p.x);
      if (cur) this.drag = { kind: "cursor", which: cur };
      else if (this._inside(p.x)) this.drag = { kind: "pan", x: p.x, view: { ...this.layout.view } };
    });
    window.addEventListener("mouseup", () => (this.drag = null));
    c.addEventListener("wheel", (e) => this._wheel(e), { passive: false });
    c.addEventListener("dblclick", () => this.resetView());
  }

  _inside(px) {
    const L = this.layout;
    return L && px >= L.ml && px <= L.ml + L.pw;
  }

  _hitCursor(px) {
    const L = this.layout;
    if (!L) return null;
    for (const k of ["A", "B"]) {
      const v = this.cursors[k];
      if (v !== null && Math.abs(this._toPx(v) - px) <= 5) return k;
    }
    return null;
  }

  _toPx(x) {
    const L = this.layout;
    const t = L.xLog ? Math.log10(x) : x;
    return L.ml + ((t - L.view.x0) / (L.view.x1 - L.view.x0)) * L.pw;
  }

  _fromPx(px) {
    const L = this.layout;
    const t = L.view.x0 + ((px - L.ml) / L.pw) * (L.view.x1 - L.view.x0);
    return L.xLog ? 10 ** t : t;
  }

  _dragMove(p) {
    const L = this.layout;
    if (this.drag.kind === "cursor") {
      const x = this._fromPx(Math.min(Math.max(p.x, L.ml), L.ml + L.pw));
      this.cursors[this.drag.which] = x;
      this.onCursors?.(this.cursors);
    } else {
      const dt = ((p.x - this.drag.x) / L.pw) * (this.drag.view.x1 - this.drag.view.x0);
      this.view = { x0: this.drag.view.x0 - dt, x1: this.drag.view.x1 - dt };
    }
    this.hoverX = p.x;
    this.draw();
  }

  _wheel(e) {
    if (!this.layout || !this._inside(this._px(e).x)) return;
    e.preventDefault();
    const L = this.layout;
    const f = Math.exp(e.deltaY * 0.0015);
    const anchor = L.view.x0 + ((this._px(e).x - L.ml) / L.pw) * (L.view.x1 - L.view.x0);
    this.view = { x0: anchor - (anchor - L.view.x0) * f, x1: anchor + (L.view.x1 - anchor) * f };
    this.draw();
  }

  resetView() {
    this.view = null;
    this.draw();
  }

  /** Letak / alih kursor di tengah paparan. */
  toggleCursor(which) {
    if (this.cursors[which] !== null) this.cursors[which] = null;
    else if (this.layout) {
      const v = this.layout.view;
      const off = which === "A" ? 0.4 : 0.6;
      const t = v.x0 + (v.x1 - v.x0) * off;
      this.cursors[which] = this.layout.xLog ? 10 ** t : t;
    }
    this.onCursors?.(this.cursors);
    this.draw();
  }

  /** Nilai setiap lengkung pada x (segmen pertama yang meliputi x). */
  valuesAt(x) {
    if (!this.data) return [];
    const { x: xs, panels, segments } = this.data;
    const out = [];
    for (const panel of panels) {
      for (const c of panel.curves) {
        let y = null;
        for (const [s, e] of segments) {
          const v = interp(xs, c.values, s, e, x);
          if (v !== null) { y = v; break; }
        }
        out.push({ name: c.name, y });
      }
    }
    return out;
  }

  /**
   * data = { x, xLabel, xLog, segments, segLabels, panels: [{ axisLabels:{L,R}, curves:[{name, values, color, axis}] }] }
   * Pulangkan paparan ke auto kecuali keepView.
   */
  set(data, { keepView = false } = {}) {
    this.data = data;
    // untuk ujian e2e: bilangan lengkung yang dilukis dan bilangan panel
    this.canvas.dataset.curves = String(data.panels.reduce((n, p) => n + p.curves.length, 0) * data.segments.length);
    this.canvas.dataset.panels = String(data.panels.length);
    if (!keepView) this.view = null;
    this.draw();
  }

  clear() {
    this.data = null;
    this.layout = null;
    this.draw();
  }

  draw() {
    const { canvas, ctx } = this;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) return;
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this._paint(ctx, w, h, true);
  }

  _paint(ctx, w, h, interactive) {
    const colors = { grid: css("--grid", "#232a36"), muted: css("--muted", "#8b93a1"), frame: css("--frame", "#3a4353") };
    ctx.clearRect(0, 0, w, h);
    ctx.font = MONO;

    const d = this.data;
    if (!d || d.panels.every((p) => p.curves.length === 0)) {
      ctx.fillStyle = colors.muted;
      ctx.textAlign = "center";
      ctx.fillText(t("plot.empty"), w / 2, h / 2);
      if (interactive) this.layout = null;
      return;
    }

    const { x: xs, xLabel, xLog, segments, segLabels, panels } = d;
    const hasR = panels.some((p) => p.curves.some((c) => c.axis === "R"));
    const ml = 68, mr = hasR ? 66 : 18, mt = 14, mb = 42, gap = 12;
    const pw = w - ml - mr;
    const totalH = h - mt - mb - gap * (panels.length - 1);
    const ph = totalH / panels.length;

    // julat x
    let t0 = Infinity, t1 = -Infinity;
    for (const v of xs) {
      const t = xLog ? Math.log10(v) : v;
      if (t < t0) t0 = t;
      if (t > t1) t1 = t;
    }
    if (t1 === t0) t1 = t0 + 1;
    const view = this.view ?? { x0: t0, x1: t1 };
    const X = (v) => ml + (((xLog ? Math.log10(v) : v) - view.x0) / (view.x1 - view.x0)) * pw;
    if (interactive) this.layout = { ml, pw, view: { ...view }, xLog };

    const xmin = xLog ? 10 ** view.x0 : view.x0;
    const xmax = xLog ? 10 ** view.x1 : view.x1;

    panels.forEach((panel, pi) => {
      const top = mt + pi * (ph + gap);
      const ranges = {};
      for (const axis of ["L", "R"]) {
        let lo = Infinity, hi = -Infinity;
        for (const c of panel.curves) {
          if ((c.axis ?? "L") !== axis) continue;
          for (const [s, e] of segments) {
            for (let i = s; i < e; i++) {
              if (xs[i] < xmin || xs[i] > xmax) continue;
              const y = c.values[i];
              if (!Number.isFinite(y)) continue;
              if (y < lo) lo = y;
              if (y > hi) hi = y;
            }
          }
        }
        if (lo === Infinity) { ranges[axis] = null; continue; }
        if (hi === lo) { const dd = Math.abs(hi) * 0.1 || 1; lo -= dd; hi += dd; }
        const pad = (hi - lo) * 0.06;
        ranges[axis] = { lo: lo - pad, hi: hi + pad };
      }
      const Yof = (axis) => {
        const r = ranges[axis];
        return (y) => top + (1 - (y - r.lo) / (r.hi - r.lo)) * ph;
      };

      // grid x
      ctx.lineWidth = 1;
      ctx.strokeStyle = colors.grid;
      ctx.fillStyle = colors.muted;
      ctx.textAlign = "center";
      const lastPanel = pi === panels.length - 1;
      const xTicks = xLog ? logTicks(view.x0, view.x1) : linTicks(view.x0, view.x1);
      for (const t of xTicks) {
        const px = Math.round(ml + ((t - view.x0) / (view.x1 - view.x0)) * pw) + 0.5;
        if (px < ml || px > ml + pw) continue;
        ctx.beginPath(); ctx.moveTo(px, top); ctx.lineTo(px, top + ph); ctx.stroke();
        if (lastPanel) ctx.fillText(fmt(xLog ? 10 ** t : t), px, top + ph + 16);
      }

      // paksi y
      for (const axis of ["L", "R"]) {
        const r = ranges[axis];
        if (!r) continue;
        const Y = Yof(axis);
        const step = niceStep(r.hi - r.lo, 6);
        ctx.textAlign = axis === "L" ? "right" : "left";
        for (let v = Math.ceil(r.lo / step) * step; v <= r.hi + step * 1e-6; v += step) {
          const py = Math.round(Y(v)) + 0.5;
          if (axis === "L" || !ranges.L) {
            ctx.strokeStyle = colors.grid;
            ctx.beginPath(); ctx.moveTo(ml, py); ctx.lineTo(ml + pw, py); ctx.stroke();
          }
          ctx.fillStyle = colors.muted;
          ctx.fillText(fmt(Math.abs(v) < step * 1e-6 ? 0 : v), axis === "L" ? ml - 8 : ml + pw + 8, py + 4);
        }
        const label = panel.axisLabels?.[axis];
        if (label) {
          ctx.save();
          ctx.fillStyle = colors.muted;
          ctx.textAlign = "center";
          ctx.translate(axis === "L" ? 12 : w - 10, top + ph / 2);
          ctx.rotate(-Math.PI / 2);
          ctx.fillText(label, 0, 0);
          ctx.restore();
        }
      }
      ctx.strokeStyle = colors.frame;
      ctx.strokeRect(ml + 0.5, top + 0.5, pw, ph);

      // lengkung
      ctx.save();
      ctx.beginPath();
      ctx.rect(ml, top, pw, ph);
      ctx.clip();
      ctx.lineWidth = 1.8;
      ctx.lineJoin = "round";
      for (const c of panel.curves) {
        const axis = c.axis ?? "L";
        if (!ranges[axis]) continue;
        const Y = Yof(axis);
        segments.forEach(([s, e], si) => {
          ctx.globalAlpha = segments.length > 1 ? 0.35 + 0.65 * ((si + 1) / segments.length) : 1;
          ctx.strokeStyle = c.color;
          ctx.beginPath();
          let pen = false;
          for (let i = s; i < e; i++) {
            const y = c.values[i];
            if (!Number.isFinite(y)) { pen = false; continue; }
            const px = X(xs[i]), py = Y(y);
            if (!pen) { ctx.moveTo(px, py); pen = true; } else ctx.lineTo(px, py);
          }
          ctx.stroke();
        });
        ctx.globalAlpha = 1;
      }
      ctx.restore();
    });

    ctx.fillStyle = colors.muted;
    ctx.textAlign = "center";
    ctx.fillText(xLabel, ml + pw / 2, h - 6);

    // label segmen (hujung kanan lengkung pertama)
    if (segments.length > 1 && segLabels) {
      const c0 = panels[0].curves[0];
      if (c0) {
        const axis = c0.axis ?? "L";
        // label diletak pada baris atas panel pertama, di hujung segmen
        ctx.font = "11px ui-monospace, monospace";
        ctx.fillStyle = c0.color;
        ctx.textAlign = "right";
        const top = mt;
        const vals = [];
        for (const [s, e] of segments) vals.push(c0.values[e - 1]);
        const lo = Math.min(...vals), hi = Math.max(...vals);
        void axis;
        segments.forEach(([, e], si) => {
          if (!segLabels[si]) return;
          const px = Math.min(X(xs[e - 1]), ml + pw - 4);
          const frac = hi === lo ? 0.5 : (vals[si] - lo) / (hi - lo);
          const py = top + 12 + (1 - frac) * (ph - 24);
          ctx.fillText(segLabels[si], px, py);
        });
        ctx.font = MONO;
      }
    }

    // kursor
    if (interactive) {
      for (const k of ["A", "B"]) {
        const v = this.cursors[k];
        if (v === null) continue;
        const px = Math.round(X(v)) + 0.5;
        if (px < ml || px > ml + pw) continue;
        ctx.strokeStyle = k === "A" ? "#f472b6" : "#22d3ee";
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(px, mt); ctx.lineTo(px, h - mb); ctx.stroke();
        ctx.fillStyle = ctx.strokeStyle;
        ctx.textAlign = "center";
        ctx.fillText(k, px, mt + 10);
      }
    }

    // bacaan hover
    if (interactive && this.hoverX !== null && !this.drag && this.hoverX >= ml && this.hoverX <= ml + pw) {
      const hx = this._fromPx(this.hoverX);
      const lines = [{ t: `${xLabel} = ${fmt(hx)}`, c: colors.muted }];
      let best = 0, bestD = Infinity;
      for (let i = 0; i < xs.length; i++) {
        const dd = Math.abs(X(xs[i]) - this.hoverX);
        if (dd < bestD) { bestD = dd; best = i; }
      }
      const px = Math.round(this.hoverX) + 0.5;
      ctx.strokeStyle = "#5b6577";
      ctx.setLineDash([4, 3]);
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(px, mt); ctx.lineTo(px, h - mb); ctx.stroke();
      ctx.setLineDash([]);
      const segOf = segments.findIndex(([s, e]) => best >= s && best < e);
      for (const panel of panels) {
        for (const c of panel.curves) {
          const label = segments.length > 1 && segLabels?.[segOf] ? `${c.name} @ ${segLabels[segOf]}` : c.name;
          lines.push({ t: `${label} = ${fmt(c.values[best])}`, c: c.color });
        }
      }
      ctx.font = MONO;
      const shown = lines.slice(0, 12);
      const bw = Math.max(...shown.map((l) => ctx.measureText(l.t).width)) + 16;
      const bh = shown.length * 16 + 10;
      let bx = px + 12;
      if (bx + bw > ml + pw) bx = px - 12 - bw;
      const by = mt + 8;
      ctx.fillStyle = css("--surface", "#0b0f15");
      ctx.globalAlpha = 0.94;
      ctx.strokeStyle = colors.frame;
      ctx.fillRect(bx, by, bw, bh);
      ctx.globalAlpha = 1;
      ctx.strokeRect(bx + 0.5, by + 0.5, bw, bh);
      ctx.textAlign = "left";
      shown.forEach((l, i) => {
        ctx.fillStyle = l.c;
        ctx.fillText(l.t, bx + 8, by + 17 + i * 16);
      });
    }
  }

  /** PNG dengan latar pepejal. Pulang Promise<Blob>. */
  toPng() {
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
    const out = document.createElement("canvas");
    out.width = w * 2;
    out.height = h * 2;
    const ctx = out.getContext("2d");
    ctx.scale(2, 2);
    ctx.fillStyle = css("--surface", "#0b0f15");
    ctx.fillRect(0, 0, w, h);
    this._paint(ctx, w, h, false);
    return new Promise((res) => out.toBlob(res, "image/png"));
  }
}

function interp(xs, ys, s, e, x) {
  for (let i = s + 1; i < e; i++) {
    const a = xs[i - 1], b = xs[i];
    if (x >= Math.min(a, b) && x <= Math.max(a, b)) {
      return b === a ? ys[i] : ys[i - 1] + ((x - a) / (b - a)) * (ys[i] - ys[i - 1]);
    }
  }
  return null;
}

function linTicks(a, b) {
  const step = niceStep(b - a, 7);
  const out = [];
  for (let v = Math.ceil(a / step) * step; v <= b + step * 1e-6; v += step) out.push(v);
  return out;
}

function logTicks(a, b) {
  const out = [];
  const span = b - a;
  const stride = Math.max(1, Math.ceil(span / 8));
  for (let t = Math.ceil(a); t <= b; t += stride) out.push(t);
  return out;
}
