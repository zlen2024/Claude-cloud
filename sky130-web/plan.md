# plan.md: SKY130 Analog Lab, from MVP to v1.0

You are a coding agent continuing an existing project. Read this whole file before writing code. Work **phase by phase, in order**. Do not start a phase until the previous phase's acceptance criteria pass.

---

## 0. Context

**What this is:** a browser-only learning lab for analog IC design. ngspice runs as WebAssembly in the browser with SkyWater SKY130 transistor models. Target users are beginners on Windows who do not want to install Linux, Xschem, Magic or a PDK.

**Owner:** Daniel, a software engineering fresh grad learning analog design from scratch. UI text is in **Bahasa Melayu**, with an English toggle added in Phase 8.

**Current state (v0.1.0, verified working on the owner's Windows machine):**

```
sky130-web/
  index.html            # layout: lesson select, netlist textarea, Run, canvas plot, legend, log
  vite.config.js        # base "./", chunkSizeWarningLimit raised
  package.json          # scripts: dev, build, preview, smoke
  src/main.js           # UI wiring, runs Simulation, builds legend, handles errors
  src/plot.js           # hand-written canvas plot, single Y axis, hover readout, SI formatting
  src/lessons.js        # 4 lessons: inverter VTC, inverter transient, NMOS Id-Vgs, PMOS Id-Vsg
  src/style.css         # dark theme
  scripts/smoke-test.mjs# runs every lesson in Node through the engine, asserts sane results
  README.md
```

**Stack:** Vite 8, plain JS (ES modules), `eecircuit-engine@^1.9.0` (MIT, ngspice compiled to WASM, by Danial Chitnis).

---

## 1. Hard facts already learned (do not rediscover these)

1. **Engine API:** `new Simulation()`, `await sim.start()` once, then repeatedly `sim.setNetList(str)` and `await sim.runSim()`. A single instance can be reused for many runs (verified). `sim.getError()` returns a `string[]` of ngspice error lines.
2. **Result shape:** `{ header, numVariables, variableNames, numPoints, dataType: "real" | "complex", data: [{ name, type, values }] }`. `data[0]` is the sweep or x axis. Complex values are `{ real, img }`.
3. **Signal names** come back as `v(out)`, `i(vdd)`, `v(v-sweep)`, and so on. Internal model nodes contain `#` (for example `v(m.xm1.msky130_fd_pr__nfet_01v8#body)`) and must be hidden from the user.
4. **SKY130 needs exactly these three lines** before any device:
   ```spice
   .param mc_switch=0
   .option scale=1.0u
   .include modelcard.skywater
   ```
   - Without `mc_switch` the model fails to parse ("Undefined parameter [mc_switch]").
   - Without `scale=1.0u` you get "could not find a valid modelname", because bins are defined in scaled units.
   - With `scale=1.0u`, W and L are written in microns (`w=0.42 l=0.15`).
5. **Devices are subcircuits:** use `xm1 d g s b sky130_fd_pr__nfet_01v8 w=.. l=..`, not `m1 ...`.
6. Verified devices: `sky130_fd_pr__nfet_01v8` and `sky130_fd_pr__pfet_01v8`. A `pfet18_hvt` model exists in the engine bundle but is **not yet verified**. Resistors, capacitors, BJTs and lvt devices are **unverified**.
7. **SPICE current sign:** current into a voltage source's + terminal is positive, so the drain current of an NMOS tied to `vd` shows up as negative `i(vd)`. Lessons must explain this, or show `-i(vd)`.
8. Other bundled model cards exist: `modelcard.CMOS90`, `modelcard.FreePDK45`, `modelcard.GF180*`, `modelcard.skywater`. Only SKY130 is in scope.
9. The engine bundle is about 20 MB (5.8 MB gzip). It loads lazily on first Run.
10. The engine currently runs on the main thread, so the UI freezes during simulation.

---

## 2. Working rules for the agent

- Run `npm run smoke` after every change that touches netlists, the engine, or result parsing. It must stay green.
- Add unit tests (Vitest) for every pure function you write: parsers, measurement helpers, netlist generator.
- From Phase 1 onward, add **browser end-to-end tests with Playwright** (`@playwright/test`). They must run on Windows. Every phase that changes UI ships at least one e2e test.
- **Never modify `node_modules` or vendor-patch the engine.** If the engine is missing something, work around it in our code and note it in `docs/engine-notes.md`.
- Keep dependencies few. Allowed additions: `vitest`, `@playwright/test`, `codemirror` 6 packages, `lz-string`, `marked` (or similar small markdown lib). Ask the owner before adding anything else.
- Every netlist shown to users must pass through the engine in a test. **No untested lesson ships.**
- Make one git commit per completed task, with a clear message. Do not squash phases together.
- Physics correctness matters more than UI polish. If you are unsure whether a lesson's expected value is right, run the simulation and derive the expected range from it plus hand calculation. Write the reasoning in a comment in the lesson file.
- When a phase is done, update `README.md` and tick the phase in the checklist at the bottom of this file.

---

## Phase 1: Foundations (repo, tests, CI, deploy)

**Tasks**
1. `git init`, add `.gitignore` (`node_modules`, `dist`, `test-results`, `playwright-report`).
2. Add Vitest. Move smoke assertions into `tests/lessons.test.js` so `npm test` runs every lesson through the engine. Keep `npm run smoke` as an alias.
3. Add Playwright. First e2e test: open the app, press Run on lesson 1, wait for the status to read "OK", assert the legend contains `v(out)`.
4. Add a GitHub Actions workflow: install, `npm test`, `npx playwright install --with-deps chromium`, `npm run test:e2e`, `npm run build`.
5. Add a GitHub Pages deploy workflow on push to `main`, publishing `dist/`.
6. Add `LICENSE` (MIT) and `NOTICE` crediting eecircuit-engine (MIT), ngspice, and the SkyWater PDK (Apache-2.0).

**Acceptance:** `npm test`, `npm run test:e2e` and `npm run build` all pass locally on Windows and in CI. The Pages URL serves a working app.

---

## Phase 2: Engine in a Web Worker

**Tasks**
1. Create `src/engine/worker.js` that owns the `Simulation` instance. Message protocol:
   - `{ type: "init" }` → `{ type: "ready" }`
   - `{ type: "run", id, netlist }` → `{ type: "result", id, result, errors, ms }` or `{ type: "error", id, message, errors }`
2. Create `src/engine/client.js` with a promise API: `await engine.run(netlist)`. One request at a time; reject or queue a second call while one is running.
3. Add a **Stop** button. Because ngspice-wasm cannot be interrupted cleanly, Stop terminates the worker and creates a new one. Show "Engine dimulakan semula".
4. Add a timeout (default 20 s, configurable) that does the same as Stop and shows a friendly message suggesting a larger step size.
5. Transfer large arrays as `Float64Array` with transferables to avoid copy cost.

**Acceptance:** the UI stays responsive (the hover readout still works) during a 50k-point transient. An e2e test covers Run → Stop → Run again. All previous tests pass.

---

## Phase 3: Results and plotting

**Tasks**
1. **Signal classification:** group signals by unit (V, A, other). Plot with **two Y axes**: voltages on the left, currents on the right. Each legend chip shows its unit.
2. **Derived signals:** let the user type an expression such as `-i(vd)`, `v(out)-v(in)` or `deriv(v(out))`. Implement a tiny safe expression evaluator in JS. **Do not use `eval`.** Support `+ - * /`, unary minus, `abs`, `db`, `deriv`, and constants.
3. **Nested sweeps:** `.dc vds 0 1.8 0.01 vgs 0 1.8 0.3` returns one flat array whose x values reset. Detect each reset and draw each segment as its own curve, labelled with the outer sweep value.
4. **AC analysis:** when `dataType === "complex"`, show a Bode view with magnitude (dB) on top and phase (degrees) below, and a log-frequency x axis. Add a helper that finds the unity-gain frequency and phase margin.
5. **Interaction:** wheel to zoom, drag to pan, double-click to reset. Two draggable cursors (A and B) show Δx and Δy.
6. **Export:** download CSV of visible signals, and download a PNG of the plot.
7. **Measurement helpers** in `src/measure.js` (pure, unit-tested): `crossing(x, y, level, edge)`, `valueAt(x, y, x0)`, `max`, `min`, `slope`, `riseTime(x, y, lo, hi)`, `propDelay(x, vin, vout, level)`, `gainDb`, `f3db`, `unityGainFreq`, `phaseMargin`.

**Acceptance:** Vitest coverage for `measure.js` and the expression evaluator is at least 90%. e2e tests cover an AC lesson and a nested-sweep lesson rendering more than one curve.

---

## Phase 4: Editor and sharing

**Tasks**
1. Replace the textarea with **CodeMirror 6**: SPICE syntax highlighting (comments `*`, dot-commands, element letters, numbers with SI suffixes), line numbers, and `Ctrl+Enter` to run.
2. **Error mapping:** parse ngspice error lines ("line no. N") and underline the matching editor line. If the error refers to a line inside the model file (line numbers far above the user's netlist length), show "Ralat dalam model PDK. Semak tiga baris wajib SKY130" instead.
3. **Linter hints** before running:
   - missing any of the three SKY130 lines → offer a one-click "Tambah header SKY130"
   - `m1 ...` used with a `sky130_fd_pr__` model → hint to use `x`
   - `w`/`l` that look like metres (for example `0.15e-6`) while scale is 1u → warn
   - no analysis line (`.dc`, `.tran`, `.ac`, `.op`) → warn
4. Autosave the editor per lesson in `localStorage`, wrapped in try/catch. "Reset lesson" restores the original.
5. **Share link:** compress the netlist with `lz-string` into the URL hash. Opening such a link loads it into a "Scratch" tab.
6. **Scratch mode:** a free netlist area not tied to any lesson.

**Acceptance:** e2e tests cover a broken netlist (error underline shows), the one-click header fix, and a share-link round trip.

---

## Phase 5: Lesson system

Turn lessons from a dropdown into a guided course.

**Lesson format:** one folder per lesson in `src/lessons/<id>/`:
- `lesson.md`: theory explanation in BM (markdown, may include formulas as plain text or KaTeX if added later), objectives, and step-by-step tasks
- `circuit.cir`: starting netlist
- `checks.js`: exports an array of `{ id, label, run(result, helpers) => { pass, actual, expected } }`
- optional `solution.cir`

**Tasks**
1. Left sidebar: course outline grouped into modules, with a progress tick per lesson (stored in localStorage).
2. Lesson panel above the editor renders `lesson.md`.
3. **Check button:** runs the user's netlist, then each check, and shows pass/fail with actual vs expected values. A lesson is complete when all checks pass.
4. **Hint ladder:** up to three hints per task, revealed one at a time. The last hint is the solution diff.
5. A test runs every `solution.cir` against its `checks.js` and must pass. It also runs every `circuit.cir` and asserts that it **simulates without errors** (starting circuits may intentionally fail checks).

**Acceptance:** all existing lessons migrated to the new format. Solutions pass their checks in CI.

---

## Phase 6: Curriculum

Write lessons in this order. Each needs theory text, a starting circuit, checks and a solution. Expected values must come from simulation plus a hand calculation recorded in a comment.

**Module A: The MOSFET**
1. NMOS Id–Vgs, finding Vth (linear extrapolation method)
2. NMOS Id–Vds family (nested sweep), triode vs saturation
3. PMOS vs NMOS, mobility ratio
4. gm and gm/Id from simulation (using `deriv`)
5. Channel-length modulation: compare L = 0.15, 0.5 and 1 µm, extract ro

**Module B: The inverter (digital meets analog)**
6. VTC, switching threshold VM, sizing PMOS so VM ≈ VDD/2
7. Noise margins (points where gain = −1)
8. Propagation delay vs load capacitance
9. Ring oscillator (odd stages), frequency vs stage count

**Module C: Single-stage amplifiers**
10. Common-source with resistor load: DC operating point, then AC gain
11. Common-source with current-source load
12. Source follower
13. Common-gate

**Module D: Current mirrors and references**
14. Basic current mirror, output resistance
15. Cascode current mirror
16. Simple beta-multiplier or self-biased reference

**Module E: Differential and op-amps**
17. Differential pair, large-signal transfer
18. 5-transistor OTA: gain, bandwidth
19. Two-stage op-amp with Miller compensation: phase margin
20. Op-amp in unity-gain feedback, step response

**Module F: Toward a real block**
21. PTAT and CTAT voltages (temperature sweep with `.temp` or `.step temp`, confirm what the engine supports)
22. Bandgap reference (simplified)
23. Comparator
24. Capstone: sense amplifier, or a 3-bit flash ADC, or a temperature-sensor front-end

**Before Module C:** verify which passive and BJT devices work in `modelcard.skywater` (for example `sky130_fd_pr__res_xhigh_po`, `sky130_fd_pr__cap_mim_m3_1`, `sky130_fd_pr__pnp_05v5`). Record results in `docs/device-support.md`. If a device is unavailable, use ideal SPICE `R`/`C`/`Q` elements and say so clearly in the lesson. **Never claim a device is "SKY130" if it is an ideal element.**

**Acceptance:** at least modules A–E complete and passing in CI. Module F may land in v1.1.

---

## Phase 7: Schematic view

**Stage 7a, viewer (required for v1.0):**
1. Parse a netlist subset (R, C, L, V, I, X-MOSFET subcircuits, comments, dot-commands) into a graph.
2. Render an SVG schematic with standard symbols (NMOS, PMOS, R, C, V, I, ground, VDD).
3. Use a simple auto-layout (VDD at top, ground at bottom, signal left to right). For lessons, allow an optional hand-placed `layout.json` that overrides auto-layout.
4. Clicking a net in the schematic toggles that signal in the plot.

**Stage 7b, editor (v1.1, after v1.0 ships):** place, rotate and wire symbols on a grid, edit W/L in a side panel, generate a netlist from the schematic, and keep netlist and schematic in sync for supported elements.

**Acceptance (7a):** every lesson in Modules A–E renders a readable schematic. Snapshot tests on the generated SVG.

---

## Phase 8: Polish and v1.0 release

1. **Language toggle** BM ↔ English, with all UI strings in `src/i18n/{ms,en}.json`. Lesson text in BM first; English versions can follow.
2. **PWA:** service worker caches the engine bundle after first load so the lab works offline. Show download progress the first time the engine loads.
3. Responsive layout at 360 px wide, keyboard navigation, focus states, `aria` labels, and a light theme.
4. "Tentang" page with credits and licenses.
5. Lighthouse scores ≥ 90 for performance (after first load), accessibility and best practices.
6. README: screenshots, how to add a lesson, architecture diagram, known limits.
7. Tag `v1.0.0`.

---

## Definition of done (v1.0)

- [x] Engine runs in a Web Worker with Stop and timeout
- [x] Plots: dual axis, nested sweep, AC Bode, zoom and pan, cursors, CSV and PNG export
- [x] CodeMirror editor with error underline, linter hints, autosave and share links
- [x] Guided lesson system with automated checks and hints
- [ ] Modules A–E written, each solution passing its checks in CI
- [ ] Schematic viewer for every lesson
- [ ] BM and EN UI, PWA offline mode, responsive layout
- [ ] Unit, engine and e2e tests green in CI; deployed on GitHub Pages
- [ ] `docs/device-support.md` and `docs/engine-notes.md` written

## Out of scope for v1.0

Layout editing (Magic-style), DRC/LVS, parasitic extraction, Monte Carlo and corners beyond `tt`, Verilog or mixed-signal co-simulation, accounts or a backend. These may become later roadmap items.

## Progress checklist

- [x] Phase 0: MVP (v0.1.0)
- [x] Phase 1: Foundations (git sudah wujud di root repo; CI + Pages workflow di .github/workflows)
- [x] Phase 2: Web Worker engine
- [x] Phase 3: Results and plotting
- [x] Phase 4: Editor and sharing
- [x] Phase 5: Lesson system
- [ ] Phase 6: Curriculum
- [ ] Phase 7: Schematic view
- [ ] Phase 8: Polish and v1.0
