// Penilai ungkapan selamat (tiada eval). Contoh: -i(vd), v(out)-v(in), deriv(v(out)), db(v(out)/v(in)).
// ctx = { signals: { "v(out)": Float64Array }, x: Float64Array, segments?: [[start,end],...] }

export class ExprError extends Error {
  constructor(message, pos) {
    super(message);
    this.pos = pos;
  }
}

const SI = { t: 1e12, g: 1e9, meg: 1e6, k: 1e3, m: 1e-3, u: 1e-6, n: 1e-9, p: 1e-12, f: 1e-15 };
const CONSTS = { pi: Math.PI, e: Math.E };

function tokenize(src, names) {
  const toks = [];
  const lower = new Map(names.map((n) => [n.toLowerCase(), n]));
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) { i++; continue; }
    if ("+-*/(),^".includes(c)) { toks.push({ t: c, pos: i }); i++; continue; }
    const num = /^(\d+\.?\d*|\.\d+)(e[+-]?\d+)?(meg|[tgkmunpf])?/i.exec(src.slice(i));
    if (num) {
      let v = parseFloat(num[0].replace(/(meg|[tgkmunpf])$/i, ""));
      if (num[3]) v *= SI[num[3].toLowerCase()];
      toks.push({ t: "num", v, pos: i });
      i += num[0].length;
      continue;
    }
    const id = /^[a-z_][a-z0-9_]*/i.exec(src.slice(i));
    if (id) {
      // isyarat `v(out)`: cari nama isyarat yang bermula pada posisi ini
      if (src[i + id[0].length] === "(") {
        const close = src.indexOf(")", i);
        if (close > 0) {
          const cand = src.slice(i, close + 1).replace(/\s+/g, "").toLowerCase();
          if (lower.has(cand)) {
            toks.push({ t: "sig", name: lower.get(cand), pos: i });
            i = close + 1;
            continue;
          }
        }
      }
      toks.push({ t: "id", name: id[0].toLowerCase(), pos: i });
      i += id[0].length;
      continue;
    }
    throw new ExprError(`Aksara tak dijangka '${c}'`, i);
  }
  toks.push({ t: "end", pos: src.length });
  return toks;
}

const FUNCS = {
  abs: { n: 1, f: (a) => map(a, Math.abs) },
  db: { n: 1, f: (a) => map(a, (v) => 20 * Math.log10(Math.abs(v))) },
  sqrt: { n: 1, f: (a) => map(a, Math.sqrt) },
  log10: { n: 1, f: (a) => map(a, Math.log10) },
  ln: { n: 1, f: (a) => map(a, Math.log) },
  deriv: { n: 1, ctx: true },
};

function map(a, f) {
  if (typeof a === "number") return f(a);
  const out = new Float64Array(a.length);
  for (let i = 0; i < a.length; i++) out[i] = f(a[i]);
  return out;
}

function zip(a, b, f) {
  const an = typeof a === "number", bn = typeof b === "number";
  if (an && bn) return f(a, b);
  const len = an ? b.length : a.length;
  const out = new Float64Array(len);
  for (let i = 0; i < len; i++) out[i] = f(an ? a : a[i], bn ? b : b[i]);
  return out;
}

function deriv(y, ctx) {
  if (typeof y === "number") throw new ExprError("deriv() perlu isyarat, bukan nombor", 0);
  const x = ctx.x;
  const segs = ctx.segments ?? [[0, y.length]];
  const out = new Float64Array(y.length);
  for (const [s, e] of segs) {
    for (let i = s; i < e; i++) {
      const a = Math.max(s, i - 1), b = Math.min(e - 1, i + 1);
      out[i] = b === a ? 0 : (y[b] - y[a]) / (x[b] - x[a]);
    }
  }
  return out;
}

export function evaluate(src, ctx) {
  const names = Object.keys(ctx.signals);
  const toks = tokenize(src, names);
  let p = 0;
  const peek = () => toks[p];
  const eat = (t) => {
    if (toks[p].t !== t) throw new ExprError(`Jangka '${t}'`, toks[p].pos);
    return toks[p++];
  };

  function expr() {
    let v = term();
    while (peek().t === "+" || peek().t === "-") {
      const op = toks[p++].t;
      const r = term();
      v = zip(v, r, op === "+" ? (a, b) => a + b : (a, b) => a - b);
    }
    return v;
  }
  function term() {
    let v = unary();
    while (peek().t === "*" || peek().t === "/") {
      const op = toks[p++].t;
      const r = unary();
      v = zip(v, r, op === "*" ? (a, b) => a * b : (a, b) => a / b);
    }
    return v;
  }
  function unary() {
    if (peek().t === "-") { p++; return map(unary(), (v) => -v); }
    if (peek().t === "+") { p++; return unary(); }
    return power();
  }
  function power() {
    const base = atom();
    if (peek().t === "^") { p++; return zip(base, unary(), Math.pow); }
    return base;
  }
  function atom() {
    const t = toks[p];
    if (t.t === "num") { p++; return t.v; }
    if (t.t === "sig") { p++; return ctx.signals[t.name]; }
    if (t.t === "(") { p++; const v = expr(); eat(")"); return v; }
    if (t.t === "id") {
      p++;
      if (peek().t !== "(") {
        if (t.name === "x" && ctx.x) return ctx.x;
        if (Object.hasOwn(CONSTS, t.name)) return CONSTS[t.name];
        throw new ExprError(`Nama tak dikenali '${t.name}'`, t.pos);
      }
      const fn = Object.hasOwn(FUNCS, t.name) ? FUNCS[t.name] : null;
      if (!fn) throw new ExprError(`Fungsi tak dikenali '${t.name}'`, t.pos);
      eat("(");
      const arg = expr();
      eat(")");
      return fn.ctx ? deriv(arg, ctx) : fn.f(arg);
    }
    throw new ExprError("Ungkapan tak lengkap", t.pos);
  }

  const v = expr();
  if (peek().t !== "end") throw new ExprError("Aksara berlebihan", peek().pos);
  if (typeof v === "number") return Float64Array.from({ length: ctx.x?.length ?? 1 }, () => v);
  return v;
}
