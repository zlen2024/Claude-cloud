import { Simulation } from "eecircuit-engine";
import { LESSONS } from "./lessons.js";
import { Plot, colorFor } from "./plot.js";
import "./style.css";

const $ = (id) => document.getElementById(id);
const els = {
  lesson: $("lesson"),
  desc: $("desc"),
  editor: $("editor"),
  run: $("run"),
  reset: $("reset"),
  status: $("status"),
  legend: $("legend"),
  log: $("log"),
  plot: $("plot"),
};

const plot = new Plot(els.plot);
let sim = null;
let result = null;
let xData = null;
let signals = []; // { name, values, color, on }

function setStatus(text, kind = "") {
  els.status.textContent = text;
  els.status.className = `status ${kind}`;
}

function logLines(lines, kind = "") {
  els.log.className = `log ${kind}`;
  els.log.textContent = lines.join("\n");
}

async function getSim() {
  if (!sim) {
    setStatus("Loading ngspice (WASM)…", "busy");
    sim = new Simulation();
    await sim.start();
  }
  return sim;
}

function loadLesson(index) {
  const lesson = LESSONS[index];
  els.editor.value = lesson.netlist;
  els.desc.textContent = lesson.description;
  result = null;
  els.legend.innerHTML = "";
  plot.clear();
  logLines([]);
}

function isPlottable(name, i) {
  // index 0 = paksi x; buang node dalaman model (#body, #dbody, ...)
  return i > 0 && !name.includes("#");
}

function defaultOn(name, nameList) {
  const preferred = nameList.filter((n) => /^v\(out\)$/i.test(n) || /^v\(in\)$/i.test(n));
  if (preferred.length) return preferred.includes(name);
  return name === nameList[0];
}

function renderLegend() {
  els.legend.innerHTML = "";
  for (const s of signals) {
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
    els.legend.append(label);
  }
}

function redraw() {
  if (!result) return plot.clear();
  const active = signals.filter((s) => s.on);
  plot.set(xData, result.data[0].name, active);
}

async function run() {
  els.run.disabled = true;
  try {
    const s = await getSim();
    setStatus("Simulating…", "busy");
    await new Promise((r) => setTimeout(r, 20)); // bagi browser repaint status dulu
    const t0 = performance.now();
    s.setNetList(els.editor.value);
    const res = await s.runSim();
    const ms = Math.round(performance.now() - t0);
    const errors = s.getError().filter((l) => l.trim());

    if (!res || res.numVariables === 0 || res.data.length === 0) {
      result = null;
      plot.clear();
      els.legend.innerHTML = "";
      setStatus("Error", "err");
      logLines(errors.length ? errors : ["Simulation gagal tanpa mesej error."], "err");
      return;
    }
    if (res.dataType === "complex") {
      result = null;
      plot.clear();
      setStatus("AC belum disokong", "err");
      logLines(["Analisis AC (complex) belum ada dalam plot MVP ni. Guna .dc atau .tran dulu."], "err");
      return;
    }

    result = res;
    xData = res.data[0].values;
    const names = res.data.map((d) => d.name).filter(isPlottable);
    let ci = 0;
    signals = res.data
      .map((d, i) => ({ d, i }))
      .filter(({ d, i }) => isPlottable(d.name, i))
      .map(({ d }) => ({
        name: d.name,
        values: d.values,
        color: colorFor(ci++),
        on: defaultOn(d.name, names),
      }));
    renderLegend();
    redraw();
    setStatus(`OK · ${res.numPoints} titik · ${ms} ms`, "ok");
    logLines(errors, errors.length ? "warn" : "");
  } catch (e) {
    setStatus("Error", "err");
    logLines([String(e?.message ?? e)], "err");
  } finally {
    els.run.disabled = false;
  }
}

LESSONS.forEach((l, i) => {
  const opt = document.createElement("option");
  opt.value = String(i);
  opt.textContent = l.title;
  els.lesson.append(opt);
});
els.lesson.addEventListener("change", () => loadLesson(Number(els.lesson.value)));
els.reset.addEventListener("click", () => loadLesson(Number(els.lesson.value)));
els.run.addEventListener("click", run);
els.editor.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
    e.preventDefault();
    run();
  }
  if (e.key === "Tab") {
    e.preventDefault();
    const { selectionStart: a, selectionEnd: b, value } = els.editor;
    els.editor.value = value.slice(0, a) + "  " + value.slice(b);
    els.editor.selectionStart = els.editor.selectionEnd = a + 2;
  }
});

loadLesson(0);
setStatus("Sedia");
