import { describe, it, expect } from "vitest";
import { parseNgspiceErrors, PDK_MESSAGE } from "../src/errors.js";
import { lintNetlist, addSkyHeader, HEADER_LINES } from "../src/lint.js";

const NET = "* t\nxm1 d g 0 0 foo w=1 l=0.15\nvd d 0 1\n.dc vx 0 1 0.1\n.end";

describe("parseNgspiceErrors", () => {
  it("in line no. N", () => {
    const r = parseNgspiceErrors(
      ["Error: unknown subckt: xm1 d g 0 0 foo w=1 l=0.15", "    in line no. 2 from file test.cir", "    Simulation interrupted due to error!", "", "Error: there aren't any circuits loaded."],
      NET,
    );
    expect(r.diagnostics).toEqual([{ line: 2, message: "unknown subckt: xm1 d g 0 0 foo w=1 l=0.15", severity: "error" }]);
    expect(r.other.join()).toContain("aren't any circuits");
  });
  it("Error on line N dalam julat", () => {
    const r = parseNgspiceErrors(["Error on line 2 or its substitute:", "  xm1 d g 0 0 foo w=1 l=0.15", "ralat x"], NET);
    expect(r.diagnostics[0]).toMatchObject({ line: 2, message: "ralat x" });
  });
  it("bin W/L dipetakan ke baris x via nama instance", () => {
    const net = "* t\nxm1 d g 0 0 sky130_fd_pr__nfet_01v8 w=2 l=0.5\n.op";
    const r = parseNgspiceErrors(
      ["Error on line 1674 or its substitute:", "  m.xm1.msky130_fd_pr__nfet_01v8 out in 0 0 xm1:sky130 l= 5e-1", "could not find a valid modelname"],
      net,
    );
    expect(r.diagnostics[0].line).toBe(2);
    expect(r.diagnostics[0].message).toContain("bin");
  });
  it("ralat dalam model PDK (tiada padanan)", () => {
    const r = parseNgspiceErrors(["Error on line 20322 or its substitute:", "  .model something", "bad"], "* t\n.op");
    expect(r.pdk).toBe(true);
    expect(r.diagnostics).toEqual([]);
    expect(PDK_MESSAGE).toMatch(/model PDK/);
  });
  it("amaran elemen tak sah dan sumber .dc tiada", () => {
    const net = "* t\nr1 a\n.dc vx 0 1 0.1";
    const r = parseNgspiceErrors(
      ["Warning: 'r1 a' is not a valid resistor instance line, ignored!", 'Fatal error: DC Transfer Function: Voltage source, current source, or resistor named "vx" is not in the circuit'],
      net,
    );
    expect(r.diagnostics.map((d) => [d.line, d.severity])).toEqual([[2, "warning"], [3, "error"]]);
  });
  it("tidak jumpa baris => other", () => {
    const r = parseNgspiceErrors(["Warning: 'zz 1' is not a valid resistor", "Error: unknown subckt: qq", 'named "vy" is not in the circuit', "teks lain"], "* t");
    expect(r.other).toHaveLength(4);
  });
});

describe("lint", () => {
  const good = `* t\n${HEADER_LINES.join("\n")}\nxm1 d g 0 0 sky130_fd_pr__nfet_01v8 w=1 l=0.15\n.op\n.end`;
  it("netlist baik tiada hint", () => expect(lintNetlist(good)).toEqual([]));
  it("header tak lengkap -> fixId header", () => {
    const r = lintNetlist("* t\nxm1 d g 0 0 sky130_fd_pr__nfet_01v8 w=1 l=0.15\n.op");
    expect(r.find((x) => x.fixId === "header")).toBeTruthy();
  });
  it("m1 dengan model sky130", () => {
    const r = lintNetlist(good.replace("xm1", "m1"));
    expect(r.some((x) => x.line === 5 && /subcircuit/.test(x.message))).toBe(true);
  });
  it("W/L dalam meter", () => {
    const r = lintNetlist(good.replace("w=1 l=0.15", "w=1e-6 l=0.15e-6"));
    expect(r.filter((x) => /meter/.test(x.message))).toHaveLength(2);
  });
  it("tiada analisis", () => {
    expect(lintNetlist(good.replace(".op\n", "")).some((x) => /analisis/.test(x.message))).toBe(true);
  });
  it("addSkyHeader menyisip hanya yang tiada dan idempoten", () => {
    const t = "* t\n.param mc_switch=0\nxm1 d g 0 0 sky130_fd_pr__nfet_01v8 w=1 l=0.15";
    const fixed = addSkyHeader(t);
    expect(fixed.split("\n").slice(1, 4)).toEqual([HEADER_LINES[1], HEADER_LINES[2], ".param mc_switch=0"]);
    expect(addSkyHeader(fixed)).toBe(fixed);
    expect(lintNetlist(fixed).find((x) => x.fixId === "header")).toBeUndefined();
  });
});
