// Plot canvas ringkas (tanpa library) untuk keputusan SPICE.

const PALETTE = ["#5aa9ff", "#ffb454", "#4ade80", "#f472b6", "#a78bfa", "#f87171", "#22d3ee", "#facc15"];
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

function niceStep(range, target) {
  const raw = range / target;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const n = raw / mag;
  const f = n < 1.5 ? 1 : n < 3 ? 2 : n < 7 ? 5 : 10;
  return f * mag;
}

export class Plot {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.data = null;
    this.hoverX = null;
    canvas.addEventListener("mousemove", (e) => {
      this.hoverX = e.clientX - canvas.getBoundingClientRect().left;
      this.draw();
    });
    canvas.addEventListener("mouseleave", () => {
      this.hoverX = null;
      this.draw();
    });
    new ResizeObserver(() => this.draw()).observe(canvas);
  }

  // series: [{ name, values, color }]
  set(xs, xLabel, series) {
    this.data = { xs, xLabel, series };
    this.draw();
  }

  clear() {
    this.data = null;
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
    ctx.clearRect(0, 0, w, h);
    ctx.font = "12px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

    if (!this.data || this.data.series.length === 0) {
      ctx.fillStyle = "#8b93a1";
      ctx.textAlign = "center";
      ctx.fillText("Tekan Run (Ctrl+Enter) untuk simulate", w / 2, h / 2);
      return;
    }

    const { xs, xLabel, series } = this.data;
    const m = { l: 68, r: 18, t: 14, b: 42 };
    const pw = w - m.l - m.r;
    const ph = h - m.t - m.b;

    let xmin = Infinity, xmax = -Infinity, ymin = Infinity, ymax = -Infinity;
    for (const x of xs) {
      if (x < xmin) xmin = x;
      if (x > xmax) xmax = x;
    }
    for (const s of series) {
      for (const y of s.values) {
        if (!Number.isFinite(y)) continue;
        if (y < ymin) ymin = y;
        if (y > ymax) ymax = y;
      }
    }
    if (xmax === xmin) xmax = xmin + 1;
    if (!Number.isFinite(ymin)) { ymin = 0; ymax = 1; }
    if (ymax === ymin) { const d = Math.abs(ymax) * 0.1 || 1; ymin -= d; ymax += d; }
    const padY = (ymax - ymin) * 0.06;
    ymin -= padY;
    ymax += padY;

    const X = (x) => m.l + ((x - xmin) / (xmax - xmin)) * pw;
    const Y = (y) => m.t + (1 - (y - ymin) / (ymax - ymin)) * ph;

    // grid + tick
    ctx.lineWidth = 1;
    ctx.strokeStyle = "#232a36";
    ctx.fillStyle = "#8b93a1";
    const xs_ = niceStep(xmax - xmin, 7);
    ctx.textAlign = "center";
    for (let v = Math.ceil(xmin / xs_) * xs_; v <= xmax + xs_ * 1e-6; v += xs_) {
      const px = Math.round(X(v)) + 0.5;
      ctx.beginPath(); ctx.moveTo(px, m.t); ctx.lineTo(px, m.t + ph); ctx.stroke();
      ctx.fillText(fmt(v), px, m.t + ph + 16);
    }
    const ys_ = niceStep(ymax - ymin, 6);
    ctx.textAlign = "right";
    for (let v = Math.ceil(ymin / ys_) * ys_; v <= ymax + ys_ * 1e-6; v += ys_) {
      const py = Math.round(Y(v)) + 0.5;
      ctx.beginPath(); ctx.moveTo(m.l, py); ctx.lineTo(m.l + pw, py); ctx.stroke();
      ctx.fillText(fmt(Math.abs(v) < ys_ * 1e-6 ? 0 : v), m.l - 8, py + 4);
    }
    ctx.strokeStyle = "#3a4353";
    ctx.strokeRect(m.l + 0.5, m.t + 0.5, pw, ph);
    ctx.fillStyle = "#8b93a1";
    ctx.textAlign = "center";
    ctx.fillText(xLabel, m.l + pw / 2, h - 6);

    // lines
    ctx.save();
    ctx.beginPath();
    ctx.rect(m.l, m.t, pw, ph);
    ctx.clip();
    ctx.lineWidth = 1.8;
    ctx.lineJoin = "round";
    for (const s of series) {
      ctx.strokeStyle = s.color;
      ctx.beginPath();
      let pen = false;
      for (let i = 0; i < xs.length; i++) {
        const y = s.values[i];
        if (!Number.isFinite(y)) { pen = false; continue; }
        const px = X(xs[i]), py = Y(y);
        if (!pen) { ctx.moveTo(px, py); pen = true; } else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }
    ctx.restore();

    // hover readout
    if (this.hoverX !== null && this.hoverX >= m.l && this.hoverX <= m.l + pw) {
      let best = 0, bestD = Infinity;
      for (let i = 0; i < xs.length; i++) {
        const d = Math.abs(X(xs[i]) - this.hoverX);
        if (d < bestD) { bestD = d; best = i; }
      }
      const px = Math.round(X(xs[best])) + 0.5;
      ctx.strokeStyle = "#5b6577";
      ctx.setLineDash([4, 3]);
      ctx.beginPath(); ctx.moveTo(px, m.t); ctx.lineTo(px, m.t + ph); ctx.stroke();
      ctx.setLineDash([]);

      const lines = [`${xLabel} = ${fmt(xs[best])}`];
      for (const s of series) {
        const y = s.values[best];
        if (Number.isFinite(y)) {
          ctx.fillStyle = s.color;
          ctx.beginPath(); ctx.arc(px, Y(y), 3.5, 0, Math.PI * 2); ctx.fill();
        }
        lines.push(`${s.name} = ${fmt(y)}`);
      }
      const bw = Math.max(...lines.map((t) => ctx.measureText(t).width)) + 16;
      const bh = lines.length * 16 + 10;
      let bx = px + 12;
      if (bx + bw > m.l + pw) bx = px - 12 - bw;
      const by = m.t + 8;
      ctx.fillStyle = "rgba(18,22,30,0.92)";
      ctx.strokeStyle = "#3a4353";
      ctx.fillRect(bx, by, bw, bh);
      ctx.strokeRect(bx + 0.5, by + 0.5, bw, bh);
      ctx.textAlign = "left";
      lines.forEach((t, i) => {
        ctx.fillStyle = i === 0 ? "#cdd5e1" : series[i - 1].color;
        ctx.fillText(t, bx + 8, by + 17 + i * 16);
      });
    }
  }
}
