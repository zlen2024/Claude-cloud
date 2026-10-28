import { describe, it, expect } from "vitest";
import { parseNetlist } from "../src/schematic/parse.js";
import { layoutGraph } from "../src/schematic/layout.js";
import { renderSchematic } from "../src/schematic/render.js";
import { LESSONS } from "../src/lessons/index.js";

const NET = `* t
.param mc_switch=0
xm1 out in 0 0 sky130_fd_pr__nfet_01v8 w=1 l=0.15
xm2 out in vdd vdd sky130_fd_pr__pfet_01v8 w=3 l=0.15
rl out 0 10k ; beban
cl out 0 1p
vdd vdd 0 1.8
vin in 0 pulse(0 1.8 1n 0.1n 0.1n 5n 10n)
ib out 0 5u
e1 x 0 in 0 2
+ ; sambungan
xa a b c d5 mystery
.tran 1n 10n
.end
`;

describe("parseNetlist", () => {
  const g = parseNetlist(NET);
  it("jenis elemen", () => {
    const k = Object.fromEntries(g.elements.map((e) => [e.name, e.kind]));
    expect(k).toMatchObject({ xm1: "nmos", xm2: "pmos", rl: "res", cl: "cap", vdd: "vsrc", vin: "vsrc", ib: "isrc", e1: "vcvs", xa: "subckt" });
  });
  it("nod, parameter dan nilai", () => {
    const m1 = g.elements.find((e) => e.name === "xm1");
    expect(m1.nodes).toEqual(["out", "in", "0", "0"]);
    expect(m1.params).toEqual({ w: "1", l: "0.15" });
    expect(g.elements.find((e) => e.name === "rl").value).toBe("10k");
    expect(g.elements.find((e) => e.name === "vin").value).toBe("pulse(0 1.8 1n 0.1n 0.1n 5n 10n)");
  });
  it("net tidak termasuk bumi", () => {
    expect(g.nets).toContain("out");
    expect(g.nets).not.toContain("0");
  });
  it("baris tajuk bukan elemen dan komen dibuang", () => {
    expect(parseNetlist("r1 a b 1k\nr2 a 0 1k").elements.map((e) => e.name)).toEqual(["r2"]);
  });
  it("M langsung dan BJT", () => {
    const g2 = parseNetlist("* t\nm1 d g s b nmos\nq1 c b e qn\nl1 a b 1u");
    expect(g2.elements.map((e) => e.kind)).toEqual(["nmos", "bjt", "ind"]);
  });
});

describe("layout", () => {
  it("lajur ikut aliran: sumber di lajur 0", () => {
    const g = parseNetlist("* t\nvin in 0 1\nxm1 out in 0 0 sky130_fd_pr__nfet_01v8 w=1 l=1\nrl out 0 1k\n");
    const l = layoutGraph(g);
    const col = Object.fromEntries(l.items.map((i) => [i.el.name, i.col]));
    expect(col.vin).toBe(0);
    expect(col.xm1).toBe(1);
    expect(col.rl).toBe(2);
  });
  it("override layout.json dan tiada pertindihan sel", () => {
    const g = parseNetlist("* t\nr1 a 0 1k\nr2 a 0 1k\n");
    const l = layoutGraph(g, { r1: [3, 0], r2: [3, 0] });
    expect(new Set(l.items.map((i) => `${i.col},${i.row}`)).size).toBe(2);
    expect(l.cols).toBe(4);
  });
  it("komponen tanpa sumber (ring) tetap dilayout", () => {
    const g = parseNetlist("* t\nr1 a b 1\nr2 b c 1\nr3 c a 1\n");
    expect(layoutGraph(g).items.map((i) => i.col)).toEqual([0, 1, 1]);
  });
});

describe("renderSchematic", () => {
  it("kosong", () => {
    expect(renderSchematic("* t\n.op\n").elements).toBe(0);
  });
  it("label net boleh diklik dan bumi/VDD dilukis sebagai simbol", () => {
    const r = renderSchematic(NET);
    expect(r.svg).toContain('data-net="out"');
    expect(r.svg).toContain('class="gnd"');
    expect(r.svg).toContain('class="supply"');
    expect(r.svg).not.toContain("NaN");
  });
});

describe("skema setiap lesson", () => {
  for (const l of LESSONS) {
    it(`${l.id}: boleh dilukis, semua elemen ada simbol, snapshot`, () => {
      for (const src of [l.netlist, l.solution]) {
        const r = renderSchematic(src);
        expect(r.warnings).toEqual([]);
        expect(r.elements).toBeGreaterThan(0);
        const n = (r.svg.match(/class="el"/g) ?? []).length;
        expect(n).toBe(r.elements);
        expect(r.svg).not.toContain("NaN");
        expect(r.svg).not.toContain("undefined");
      }
      expect(renderSchematic(l.solution).svg).toMatchSnapshot();
    });
  }
});
