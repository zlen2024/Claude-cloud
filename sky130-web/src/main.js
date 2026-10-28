import { Engine, EngineAbortError } from "./engine/client.js";
import { LESSONS, SCRATCH, MODULES } from "./lessons/index.js";
import { runChecks } from "./checks.js";
import { diffText } from "./diff.js";
import { marked } from "marked";
import { renderSchematic } from "./schematic/render.js";
import { createEditor } from "./editor.js";
import { lintNetlist, addSkyHeader } from "./lint.js";
import { parseNgspiceErrors, PDK_MESSAGE } from "./errors.js";
import { encodeShare, decodeShare } from "./share.js";
import { store } from "./storage.js";
import { Plot, colorFor, fmt } from "./plot.js";
import { buildSignals, inferUnit, toCsv } from "./signals.js";
import { evaluate, ExprError } from "./expr.js";
import { f3db, unityGainFreq, phaseMargin } from "./measure.js";
import "./style.css";

const $ = (id) => document.getElementById(id);
const els = {
  outline: $("outline"), lessonMd: $("lesson-md"), checksEl: $("checks"), check: $("check"), editorHost: $("editor"), hints: $("hints"), share: $("share"), run: $("run"), reset: $("reset"), stop: $("stop"),
  status: $("status"), legend: $("legend"), log: $("log"), plot: $("plot"), info: $("info"),
  expr: $("expr"), exprAdd: $("expr-add"), curA: $("cur-a"), curB: $("cur-b"), csv: $("csv"), png: $("png"), tabPlot: $("tab-plot"), tabSchem: $("tab-schem"), schem: $("schem"), plotWrap: document.querySelector(".plotwrap"),
};

const plot = new Plot(els.plot);
const engine = new Engine();
let built = null; // keluaran buildSignals
let items = []; // { name, unit, values|mag+phase, color, on, derived }
let exprs = []; // ungkapan terbitan (dinilai semula selepas setiap run)
let netlistRun = "";
let lastRes = null;

function setStatus(text, kind = "") {
  els.status.textContent = text;
  els.status.className = `status ${kind}`;
}

function logLines(lines, kind = "") {
  els.log.className = `log ${kind}`;
  els.log.textContent = lines.join("\n");
}

const ALL = [...LESSONS, SCRATCH];
let current = ALL[0];
let lintDiags = [];
let runDiags = [];
let saveTimer = null;

const editor = createEditor(els.editorHost, {
  onRun: () => run(),
  onChange: () => {
    runDiags = [];
    store.set(`netlist:${current.id}`, editor.getValue());
    clearTimeout(saveTimer);
    saveTimer = setTimeout(refreshLint, 300);
  },
});

let view = "plot";

function renderSchem() {
  if (view !== "schem") return;
  const r = renderSchematic(editor.getValue(), { layout: current.layout });
  els.schem.innerHTML = r.svg || '<p class="desc">Tiada elemen untuk dilukis.</p>';
  markSchemActive();
}

function markSchemActive() {
  const on = new Set(items.filter((i) => i.on).map((i) => i.name.toLowerCase()));
  for (const n of els.schem.querySelectorAll(".netlabel")) n.classList.toggle("on", on.has(`v(${n.dataset.net})`));
}

function setView(v) {
  view = v;
  els.schem.hidden = v !== "schem";
  els.plotWrap.hidden = v !== "plot";
  els.tabPlot.classList.toggle("on", v === "plot");
  els.tabSchem.classList.toggle("on", v === "schem");
  els.tabPlot.setAttribute("aria-selected", String(v === "plot"));
  els.tabSchem.setAttribute("aria-selected", String(v === "schem"));
  if (v === "plot") plot.draw();
  renderSchem();
}

function toggleNet(net) {
  const it = items.find((i) => i.name.toLowerCase() === `v(${net})`);
  if (!it) {
    setStatus(`Tiada isyarat v(${net}). Jalankan simulation dahulu.`, "err");
    return;
  }
  it.on = !it.on;
  renderLegend();
  redraw();
  markSchemActive();
}

function refreshLint() {
  renderSchem();
  lintDiags = lintNetlist(editor.getValue());
  applyDiagnostics();
  renderHints();
}

function applyDiagnostics() {
  editor.setDiagnostics([...lintDiags.filter((d) => d.line > 0), ...runDiags]);
}

function renderHints() {
  els.hints.innerHTML = "";
  for (const d of lintDiags.filter((x) => x.line === 0)) {
    const div = document.createElement("div");
    div.className = "hint";
    div.textContent = d.message;
    if (d.fixId === "header") {
      const b = document.createElement("button");
      b.id = "fix-header";
      b.textContent = "Tambah header SKY130";
      b.addEventListener("click", () => {
        editor.setValue(addSkyHeader(editor.getValue()));
        store.set(`netlist:${current.id}`, editor.getValue());
        refreshLint();
      });
      div.append(b);
    }
    els.hints.append(div);
  }
}

function loadLesson(index, { text, reset = false } = {}) {
  const lesson = ALL[index];
  current = lesson;
  renderOutline();
  els.check.hidden = lesson.checks.length === 0;
  els.checksEl.innerHTML = "";
  if (reset) store.remove(`netlist:${lesson.id}`);
  editor.setValue(text ?? store.get(`netlist:${lesson.id}`) ?? lesson.netlist);
  if (text !== undefined) store.set(`netlist:${lesson.id}`, text);
  runDiags = [];
  refreshLint();
  els.lessonMd.innerHTML = marked.parse(lesson.md);
  els.lessonMd.scrollTop = 0;
  built = null;
  items = [];
  exprs = [];
  els.legend.innerHTML = "";
  els.info.textContent = "";
  plot.cursors = { A: null, B: null };
  syncCursorButtons();
  plot.clear();
  logLines([]);
}

function defaultOn(name, all) {
  const re = built.kind === "ac" ? /^v\(out\)$/i : /^v\((out|in)\)$/i;
  const preferred = all.filter((n) => re.test(n));
  return preferred.length ? preferred.includes(name) : name === all[0];
}

function renderLegend() {
  queueMicrotask(markSchemActive);
  els.legend.innerHTML = "";
  for (const s of items) {
    const label = document.createElement("label");
    label.className = "chip";
    label.style.setProperty("--c", s.color);
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = s.on;
    cb.addEventListener("change", () => {
      s.on = cb.checked;
      redraw();
    });
    label.append(cb, document.createTextNode(s.name));
    if (s.unit) {
      const u = document.createElement("small");
      u.textContent = `[${s.unit}]`;
      label.append(u);
    }
    if (s.derived) {
      const rm = document.createElement("button");
      rm.className = "rm";
      rm.type = "button";
      rm.textContent = "×";
      rm.title = "Buang";
      rm.addEventListener("click", (e) => {
        e.preventDefault();
        exprs = exprs.filter((x) => x !== s.name);
        items = items.filter((x) => x !== s);
        renderLegend();
        redraw();
      });
      label.append(rm);
    }
    els.legend.append(label);
  }
}

function plotData() {
  const active = items.filter((s) => s.on);
  const { x, xLabel, xLog, segments, segLabels } = built;
  if (built.kind === "ac") {
    return {
      x, xLabel, xLog, segments, segLabels,
      panels: [
        { axisLabels: { L: "gandaan (dB)" }, curves: active.map((s) => ({ name: `${s.name} (dB)`, values: s.mag, color: s.color })) },
        { axisLabels: { L: "fasa (°)" }, curves: active.map((s) => ({ name: `${s.name} (°)`, values: s.phase, color: s.color })) },
      ],
    };
  }
  const curves = active.map((s) => ({ name: s.name, values: s.values, color: s.color, axis: s.unit === "V" ? "L" : "R" }));
  const hasA = active.some((s) => s.unit === "A");
  const hasV = active.some((s) => s.unit === "V");
  return {
    x, xLabel, xLog, segments, segLabels,
    panels: [{ axisLabels: { L: hasV ? "V" : "", R: hasA ? "A" : "" }, curves }],
  };
}

function updateInfo() {
  const lines = [];
  if (built?.kind === "ac") {
    const s = items.find((i) => i.on && /^v\(out\)$/i.test(i.name)) ?? items.find((i) => i.on);
    if (s) {
      const f = Array.from(built.x);
      const fu = unityGainFreq(f, Array.from(s.mag));
      const f3 = f3db(f, Array.from(s.mag));
      const pm = phaseMargin(f, Array.from(s.mag), Array.from(s.phase));
      lines.push(
        `${s.name}: A0 = ${s.mag[0].toFixed(1)} dB · f-3dB = ${f3 ? fmt(f3) + "Hz" : "-"} · ` +
          `fu = ${fu ? fmt(fu) + "Hz" : "-"} · PM = ${pm === null ? "-" : pm.toFixed(1) + "°"}`,
      );
    }
  }
  const { A, B } = plot.cursors;
  if (A !== null || B !== null) {
    const a = A !== null ? plot.valuesAt(A) : null;
    const b = B !== null ? plot.valuesAt(B) : null;
    const xl = built?.kind === "ac" ? "f" : (built?.xLabel ?? "x");
    if (A !== null) lines.push(`A: ${xl} = ${fmt(A)}`);
    if (B !== null) lines.push(`B: ${xl} = ${fmt(B)}`);
    if (a && b) lines.push(`Δ${xl} = ${fmt(B - A)}`);
    (a ?? b ?? []).forEach((v, i) => {
      const parts = [];
      if (a) parts.push(`A=${v.y === null ? "-" : fmt(a[i].y)}`);
      if (b) parts.push(`B=${fmt(b[i].y)}`);
      if (a && b && a[i].y !== null && b[i].y !== null) parts.push(`Δ=${fmt(b[i].y - a[i].y)}`);
      lines.push(`  ${v.name}: ${parts.join("  ")}`);
    });
  }
  els.info.textContent = lines.join("\n");
}

function redraw() {
  if (!built) return plot.clear();
  plot.set(plotData(), { keepView: true });
  updateInfo();
}

function syncCursorButtons() {
  els.curA.classList.toggle("on", plot.cursors.A !== null);
  els.curB.classList.toggle("on", plot.cursors.B !== null);
}
plot.onCursors = () => {
  syncCursorButtons();
  updateInfo();
};

function addDerived(src, { quiet = false } = {}) {
  if (!built || built.kind !== "real") {
    if (!quiet) logLines(["Ungkapan terbitan hanya untuk keputusan .dc dan .tran."], "err");
    return false;
  }
  try {
    const signals = {};
    for (const s of items.filter((i) => !i.derived)) signals[s.name] = s.values;
    const values = evaluate(src, { signals, x: built.x, segments: built.segments });
    items.push({
      name: src, unit: inferUnit(src, items.filter((i) => !i.derived)), values,
      color: colorFor(items.length), on: true, derived: true,
    });
    return true;
  } catch (e) {
    if (!quiet) logLines([e instanceof ExprError ? `Ungkapan: ${e.message} (pos ${e.pos})` : String(e)], "err");
    return false;
  }
}

const isDone = (l) => store.get(`done:${l.id}`) === "1";

function renderOutline() {
  els.outline.innerHTML = "";
  const add = (l) => {
    const b = document.createElement("button");
    b.type = "button";
    b.dataset.lesson = l.id;
    b.className = l === current ? "active" : "";
    b.setAttribute("aria-current", l === current ? "true" : "false");
    const t = document.createElement("span");
    t.textContent = l.title;
    b.append(t);
    if (isDone(l)) {
      const k = document.createElement("span");
      k.className = "tick";
      k.textContent = "✓";
      k.title = "Siap";
      b.append(k);
    }
    b.addEventListener("click", () => loadLesson(ALL.indexOf(l)));
    els.outline.append(b);
  };
  for (const [key, name] of Object.entries(MODULES)) {
    const ls = LESSONS.filter((l) => l.module === key);
    if (!ls.length) continue;
    const h = document.createElement("h3");
    h.textContent = `${key}. ${name}`;
    els.outline.append(h);
    ls.forEach(add);
  }
  const h = document.createElement("h3");
  h.textContent = "Bebas";
  els.outline.append(h);
  add(SCRATCH);
}

const hintLevel = new Map();

function renderChecks(results) {
  els.checksEl.innerHTML = "";
  for (const c of results) {
    const row = document.createElement("div");
    row.className = "check";
    row.dataset.check = c.id;
    row.dataset.pass = String(c.pass);
    const mark = document.createElement("span");
    mark.className = `mark ${c.pass ? "ok" : "bad"}`;
    mark.textContent = c.pass ? "✓" : "✗";
    const body = document.createElement("div");
    body.textContent = c.label;
    const vals = document.createElement("div");
    vals.className = "vals";
    vals.textContent = `sebenar: ${c.actual}   jangkaan: ${c.expected}`;
    body.append(vals);
    row.append(mark, body);
    if (!c.pass) {
      const ladder = [...c.hints];
      if (current.solution) ladder.push("Penyelesaian (beza daripada litar asal):\n" + (diffText(current.netlist, current.solution) || "(tiada beza)"));
      const key = `${current.id}/${c.id}`;
      const shown = hintLevel.get(key) ?? 0;
      if (shown > 0) {
        const box = document.createElement("div");
        box.className = "hintbox";
        ladder.slice(0, shown).forEach((h, i) => {
          if (i === ladder.length - 1 && current.solution) {
            const pre = document.createElement("pre");
            pre.textContent = h;
            box.append(pre);
          } else {
            const p = document.createElement("div");
            p.textContent = `Petunjuk ${i + 1}: ${h}`;
            box.append(p);
          }
        });
        row.append(box);
      }
      if (shown < ladder.length) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "hint-btn";
        btn.textContent = `Petunjuk (${shown + 1}/${ladder.length})`;
        btn.addEventListener("click", () => {
          hintLevel.set(key, shown + 1);
          renderChecks(results);
        });
        row.append(btn);
      }
    }
    els.checksEl.append(row);
  }
  if (results.every((c) => c.pass)) {
    const d = document.createElement("div");
    d.className = "done";
    d.textContent = "Lesson siap! Semua semakan lulus.";
    els.checksEl.append(d);
  }
}

async function check() {
  if (!current.checks.length) return;
  const ok = await run();
  if (!ok) return;
  const results = runChecks(current.checks, lastRes, netlistRun);
  renderChecks(results);
  if (results.every((c) => c.pass) && !isDone(current)) {
    store.set(`done:${current.id}`, "1");
    renderOutline();
  }
}

function showRunErrors(errors, fallback = "Ralat tidak diketahui.") {
  const { diagnostics, pdk, other } = parseNgspiceErrors(errors, netlistRun);
  runDiags = diagnostics;
  applyDiagnostics();
  const lines = diagnostics.map((d) => `Baris ${d.line}: ${d.message}`);
  if (pdk) lines.push(PDK_MESSAGE);
  if (!lines.length) lines.push(...(other.length ? other : [fallback]));
  logLines(lines, "err");
}

async function run() {
  els.run.disabled = true;
  els.stop.disabled = false;
  try {
    setStatus("Simulating…", "busy");
    netlistRun = editor.getValue();
    runDiags = [];
    applyDiagnostics();
    const { result: res, errors, ms } = await engine.run(netlistRun);

    if (!res || res.numVariables === 0 || res.data.length === 0) {
      built = null;
      plot.clear();
      els.legend.innerHTML = "";
      setStatus("Error", "err");
      showRunErrors(errors, "Simulation gagal tanpa mesej error.");
      return false;
    }

    built = buildSignals(res, netlistRun);
    const names = built.signals.map((s) => s.name);
    items = built.signals.map((s, i) => ({ ...s, color: colorFor(i), on: defaultOn(s.name, names) }));
    exprs = exprs.filter((src) => addDerived(src, { quiet: true }));
    renderLegend();
    plot.set(plotData());
    updateInfo();
    setStatus(`OK · ${res.numPoints} titik · ${ms} ms`, "ok");
    logLines(errors, errors.length ? "warn" : "");
    lastRes = res;
    return true;
  } catch (e) {
    if (e instanceof EngineAbortError) {
      setStatus(e.reason === "timeout" ? "Timeout" : "Engine dimulakan semula", "err");
      logLines(
        e.reason === "timeout"
          ? [`Simulation lebih ${engine.timeoutMs / 1000}s dan dihentikan. Cuba besarkan step size (contoh .tran 10n -> 50n).`]
          : [],
        "err",
      );
    } else {
      setStatus("Error", "err");
      if (e?.errors?.length) showRunErrors(e.errors);
      else logLines([String(e?.message ?? e)], "err");
    }
    return false;
  } finally {
    els.run.disabled = false;
    els.stop.disabled = true;
  }
}

function download(name, blob) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function exportCsv() {
  if (!built) return;
  const active = items.filter((s) => s.on);
  const series =
    built.kind === "ac"
      ? active.flatMap((s) => [{ name: `${s.name} (dB)`, values: s.mag }, { name: `${s.name} (deg)`, values: s.phase }])
      : active;
  download("sky130-lab.csv", new Blob([toCsv(built.xLabel, built.x, series)], { type: "text/csv" }));
}

els.reset.addEventListener("click", () => loadLesson(ALL.indexOf(current), { reset: true }));
els.share.addEventListener("click", async () => {
  const url = location.origin + location.pathname + encodeShare(editor.getValue());
  history.replaceState(null, "", url);
  try {
    await navigator.clipboard.writeText(url);
    setStatus("Pautan kongsi disalin", "ok");
  } catch {
    setStatus("Pautan kongsi ada dalam bar alamat", "ok");
  }
});
els.tabPlot.addEventListener("click", () => setView("plot"));
els.tabSchem.addEventListener("click", () => setView("schem"));
els.schem.addEventListener("click", (e) => {
  const n = e.target.closest?.(".netlabel");
  if (n) toggleNet(n.dataset.net);
});
els.schem.addEventListener("keydown", (e) => {
  const n = e.target.closest?.(".netlabel");
  if (n && (e.key === "Enter" || e.key === " ")) {
    e.preventDefault();
    toggleNet(n.dataset.net);
  }
});
els.schem.addEventListener("mouseover", (e) => {
  const net = e.target.closest?.(".netlabel")?.dataset.net;
  for (const n of els.schem.querySelectorAll(".netlabel")) n.classList.toggle("hl", !!net && n.dataset.net === net);
});
els.check.addEventListener("click", check);
els.run.addEventListener("click", run);
els.stop.addEventListener("click", () => engine.stop());
els.exprAdd.addEventListener("click", () => {
  const src = els.expr.value.trim();
  if (!src) return;
  if (addDerived(src)) {
    exprs.push(src);
    els.expr.value = "";
    logLines([]);
    renderLegend();
    redraw();
  }
});
els.expr.addEventListener("keydown", (e) => e.key === "Enter" && els.exprAdd.click());
els.curA.addEventListener("click", () => plot.toggleCursor("A"));
els.curB.addEventListener("click", () => plot.toggleCursor("B"));
els.csv.addEventListener("click", exportCsv);
els.png.addEventListener("click", async () => built && download("sky130-lab.png", await plot.toPng()));
const shared = decodeShare(location.hash);
loadLesson(shared !== null ? ALL.length - 1 : 0, shared !== null ? { text: shared } : {});
setStatus("Sedia");
