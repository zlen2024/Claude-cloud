import { describe, it, expect } from "vitest";
import {
  splitSegments, parseDcSweeps, segmentLabels, parseSpiceNumber, buildSignals, inferUnit, toCsv, unitOf,
} from "../src/signals.js";

describe("signals", () => {
  it("unitOf", () => {
    expect(unitOf("v(out)")).toBe("V");
    expect(unitOf("i(vdd)")).toBe("A");
    expect(unitOf("time")).toBe("");
  });
  it("splitSegments menaik, menurun, satu segmen", () => {
    expect(splitSegments([0, 1, 2, 0, 1, 2])).toEqual([[0, 3], [3, 6]]);
    expect(splitSegments([2, 1, 0, 2, 1, 0])).toEqual([[0, 3], [3, 6]]);
    expect(splitSegments([0, 1, 2, 3])).toEqual([[0, 4]]);
    expect(splitSegments([1, 1, 1])).toEqual([[0, 3]]);
    expect(splitSegments([0, 1])).toEqual([[0, 2]]);
  });
  it("parseSpiceNumber", () => {
    expect(parseSpiceNumber("10k")).toBe(1e4);
    expect(parseSpiceNumber("0.3")).toBeCloseTo(0.3);
    expect(parseSpiceNumber("1meg")).toBe(1e6);
    expect(parseSpiceNumber("-0.01")).toBe(-0.01);
    expect(parseSpiceNumber("abc")).toBeNaN();
  });
  it("parseDcSweeps / segmentLabels", () => {
    const n = "* x\n.dc vd 0 1.8 0.1 vg 0.6 1.8 0.3\n.end";
    const sw = parseDcSweeps(n);
    expect(sw).toHaveLength(2);
    expect(sw[1]).toMatchObject({ src: "vg", start: 0.6, step: 0.3 });
    expect(segmentLabels(n, 5)).toEqual(["vg = 0.6", "vg = 0.9", "vg = 1.2", "vg = 1.5", "vg = 1.8"]);
    expect(segmentLabels(".dc vin 0 1 0.1", 1)).toEqual([""]);
    expect(parseDcSweeps("* tiada")).toEqual([]);
  });
  it("buildSignals real menyembunyikan nod dalaman dan memecah segmen", () => {
    const res = {
      dataType: "real",
      data: [
        { name: "v(v-sweep)", values: Float64Array.from([0, 1, 0, 1]) },
        { name: "v(d)", values: Float64Array.from([0, 1, 0, 1]) },
        { name: "v(m.x#body)", values: Float64Array.from([0, 0, 0, 0]) },
      ],
    };
    const b = buildSignals(res, ".dc vd 0 1 1 vg 0 1 1");
    expect(b.signals.map((s) => s.name)).toEqual(["v(d)"]);
    expect(b.segments).toEqual([[0, 2], [2, 4]]);
    expect(b.segLabels).toEqual(["vg = 0", "vg = 1"]);
  });
  it("buildSignals AC beri mag dan fasa", () => {
    const res = {
      dataType: "complex",
      data: [
        { name: "frequency", values: [{ real: 1, img: 0 }, { real: 10, img: 0 }] },
        { name: "v(out)", values: [{ real: 10, img: 0 }, { real: 0, img: 10 }] },
      ],
    };
    const b = buildSignals(res);
    expect(b.kind).toBe("ac");
    expect(b.x[1]).toBe(10);
    expect(b.signals[0].mag[0]).toBeCloseTo(20);
    expect(b.signals[0].phase[1]).toBeCloseTo(90);
  });
  it("inferUnit", () => {
    const sigs = [{ name: "v(out)", unit: "V" }, { name: "v(in)", unit: "V" }, { name: "i(vd)", unit: "A" }];
    expect(inferUnit("v(out)-v(in)", sigs)).toBe("V");
    expect(inferUnit("-i(vd)", sigs)).toBe("A");
    expect(inferUnit("deriv(v(out))", sigs)).toBe("");
    expect(inferUnit("v(out)+i(vd)", sigs)).toBe("");
  });
  it("toCsv", () => {
    expect(toCsv("x", [1, 2], [{ name: "a", values: [3, 4] }])).toBe("x,a\n1,3\n2,4\n");
  });
});
