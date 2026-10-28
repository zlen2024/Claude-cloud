import { describe, it, expect } from "vitest";
import { evaluate, ExprError } from "../src/expr.js";

const x = Float64Array.from([0, 1, 2, 3]);
const ctx = {
  x,
  signals: {
    "v(out)": Float64Array.from([0, 1, 4, 9]),
    "v(in)": Float64Array.from([1, 1, 1, 1]),
    "i(vd)": Float64Array.from([-1, -2, -3, -4]),
    "v(v-sweep)": x,
  },
};
const ev = (s, c = ctx) => Array.from(evaluate(s, c));

describe("expr", () => {
  it("aritmetik dan keutamaan", () => {
    expect(ev("1+2*3")).toEqual([7, 7, 7, 7]);
    expect(ev("(1+2)*3")).toEqual([9, 9, 9, 9]);
    expect(ev("2^3^2")).toEqual([512, 512, 512, 512]);
    expect(ev("-2^2")).toEqual([-4, -4, -4, -4]);
    expect(() => evaluate("constructor(1)", ctx)).toThrow(ExprError);
  });
  it("isyarat", () => {
    expect(ev("-i(vd)")).toEqual([1, 2, 3, 4]);
    expect(ev("v(out)-v(in)")).toEqual([-1, 0, 3, 8]);
    expect(ev("V(OUT) / 2")).toEqual([0, 0.5, 2, 4.5]);
    expect(ev("v(v-sweep)*1")).toEqual([0, 1, 2, 3]);
  });
  it("fungsi abs db sqrt", () => {
    expect(ev("abs(i(vd))")).toEqual([1, 2, 3, 4]);
    expect(ev("db(10)")[0]).toBeCloseTo(20);
    expect(ev("sqrt(v(out))")).toEqual([0, 1, 2, 3]);
    expect(ev("log10(100)")[0]).toBeCloseTo(2);
    expect(ev("ln(e)")[0]).toBeCloseTo(1);
  });
  it("deriv", () => {
    expect(ev("deriv(v(out))")).toEqual([1, 2, 4, 5]);
    expect(ev("deriv(x)")).toEqual([1, 1, 1, 1]);
  });
  it("deriv ikut segmen", () => {
    const c = { ...ctx, segments: [[0, 2], [2, 4]] };
    expect(ev("deriv(v(out))", c)).toEqual([1, 1, 5, 5]);
  });
  it("konstanta dan akhiran SI", () => {
    expect(ev("pi")[0]).toBeCloseTo(Math.PI);
    expect(ev("2k")[0]).toBe(2000);
    expect(ev("3meg")[0]).toBe(3e6);
    expect(ev("1e-3")[0]).toBe(1e-3);
    expect(ev("10u + 5n")[0]).toBeCloseTo(10.005e-6);
  });
  it("ralat", () => {
    expect(() => evaluate("v(foo)", ctx)).toThrow(ExprError);
    expect(() => evaluate("1 +", ctx)).toThrow(/tak lengkap/);
    expect(() => evaluate("1 2", ctx)).toThrow(/berlebihan/);
    expect(() => evaluate("(1", ctx)).toThrow(/Jangka/);
    expect(() => evaluate("foo(1)", ctx)).toThrow(/Fungsi/);
    expect(() => evaluate("zzz", ctx)).toThrow(/Nama/);
    expect(() => evaluate("1 $ 2", ctx)).toThrow(/Aksara/);
    expect(() => evaluate("deriv(2)", ctx)).toThrow(/isyarat/);
  });
  it("tidak menjalankan kod (selamat)", () => {
    expect(() => evaluate("constructor", ctx)).toThrow(ExprError);
    expect(() => evaluate("process.exit()", ctx)).toThrow(ExprError);
  });
});
