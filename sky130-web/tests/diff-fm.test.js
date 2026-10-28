import { describe, it, expect } from "vitest";
import { lineDiff, diffText } from "../src/diff.js";
import { parseFrontmatter } from "../src/frontmatter.js";

describe("diff", () => {
  it("baris berubah", () => {
    expect(diffText("a\nb\nc", "a\nB\nc")).toBe("- b\n+ B");
  });
  it("tambah dan buang", () => {
    expect(lineDiff("a", "a\nb").map((d) => d.type)).toEqual(["same", "add"]);
    expect(lineDiff("a\nb", "a").map((d) => d.type)).toEqual(["same", "del"]);
    expect(diffText("a", "a")).toBe("");
  });
});
describe("frontmatter", () => {
  it("meta dan body", () => {
    const r = parseFrontmatter("---\ntitle: Hello dunia\norder: 3\n---\n# Isi\n");
    expect(r.meta).toEqual({ title: "Hello dunia", order: 3 });
    expect(r.body).toBe("# Isi\n");
  });
  it("tiada frontmatter", () => {
    expect(parseFrontmatter("# saja")).toEqual({ meta: {}, body: "# saja" });
  });
});
