import { Engine, EngineAbortError } from "./engine/client.js";
import { LESSONS, SCRATCH } from "./lessons.js";
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
  lesson: $("lesson"), desc: $("desc"), editorHost: $("editor"), hints: $("hints"), share: $("share"), run: $("run"), reset: $("reset"), stop: $("stop"),
  status: $("status"), legend: $("legend"), log: $("log"), plot: $("plot"), info: $("info"),
  expr: $("expr"), exprAdd: $("expr-add"), curA: $("cur-a"), curB: $("cur-b"), csv: $("csv"), png: $("png"),
};

const plot = new Plot(els.plot);
const engine = new Engine();
let built = null; // keluaran buildSignals
let items = []; // { name, unit, values|mag+phase, color, on, derived }
let exprs = []; // ungkapan terbitan (dinilai semula selepas setiap run)
let netlistRun = "";

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

function refreshLint() {
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
  els.lesson.value = String(index);
  if (reset) store.remove(`netlist:${lesson.id}`);
  editor.setValue(text ?? store.get(`netlist:${lesson.id}`) ?? lesson.netlist);
  if (text !== undefined) store.set(`netlist:${lesson.id}`, text);
  runDiags = [];
  refreshLint();
  els.desc.textContent = lesson.description;
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
      return;
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

ALL.forEach((l, i) => {
  const opt = document.createElement("option");
  opt.value = String(i);
  opt.textContent = l.title;
  els.lesson.append(opt);
});
els.lesson.addEventListener("change", () => loadLesson(Number(els.lesson.value)));
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
