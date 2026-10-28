// Menjana SVG skema (rentetan tulen, deterministik supaya boleh di-snapshot).
import { parseNetlist, isGround, isSupply } from "./parse.js";
import { layoutGraph, CELL_W, CELL_H, MARGIN } from "./layout.js";

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const r1 = (n) => Math.round(n * 10) / 10;

// Setiap simbol: lukisan (SVG, koordinat tempatan dengan pusat 0,0) dan pin [{name, x, y, dx, dy}]
const SYMBOLS = {
  nmos: (el) => ({
    draw:
      `<path d="M-40 0H-18M-18 -16V16M-10 -18V-10M-10 -4V4M-10 10V18M-10 -14H10V-40M-10 14H10V40"/>` +
      `<path d="M-2 14L-10 14M-10 14L-4 10M-10 14L-4 18" class="arrow"/>`,
    pins: [
      { name: "g", x: -40, y: 0, dx: -1, dy: 0 },
      { name: "d", x: 10, y: -40, dx: 0, dy: -1 },
      { name: "s", x: 10, y: 40, dx: 0, dy: 1 },
    ],
    map: { g: 1, d: 0, s: 2 },
    body: el.nodes[3],
  }),
  pmos: (el) => ({
    draw:
      `<path d="M-40 0H-24M-18 -16V16M-10 -18V-10M-10 -4V4M-10 10V18M-10 -14H10V-40M-10 14H10V40"/>` +
      `<circle cx="-21" cy="0" r="3" class="bubble"/><path d="M-4 -14L-10 -14M-10 -14L-4 -18M-10 -14L-4 -10" class="arrow"/>`,
    pins: [
      { name: "g", x: -40, y: 0, dx: -1, dy: 0 },
      { name: "s", x: 10, y: -40, dx: 0, dy: -1 },
      { name: "d", x: 10, y: 40, dx: 0, dy: 1 },
    ],
    map: { g: 1, d: 2, s: 0 },
    body: el.nodes[3],
  }),
  res: () => ({
    draw: `<path d="M0 -40V-20M0 20V40"/><rect x="-7" y="-20" width="14" height="40"/>`,
    pins: [{ x: 0, y: -40, dx: 0, dy: -1 }, { x: 0, y: 40, dx: 0, dy: 1 }],
  }),
  cap: () => ({
    draw: `<path d="M0 -40V-5M0 5V40M-14 -5H14M-14 5H14"/>`,
    pins: [{ x: 0, y: -40, dx: 0, dy: -1 }, { x: 0, y: 40, dx: 0, dy: 1 }],
  }),
  ind: () => ({
    draw: `<path d="M0 -40V-24A6 6 0 0 1 0 -12A6 6 0 0 1 0 0A6 6 0 0 1 0 12A6 6 0 0 1 0 24V40" fill="none"/>`,
    pins: [{ x: 0, y: -40, dx: 0, dy: -1 }, { x: 0, y: 40, dx: 0, dy: 1 }],
  }),
  vsrc: () => ({
    draw: `<path d="M0 -40V-16M0 16V40"/><circle r="16"/><path d="M0 -10V-4M-3 -7H3M-3 7H3" class="sign"/>`,
    pins: [{ x: 0, y: -40, dx: 0, dy: -1 }, { x: 0, y: 40, dx: 0, dy: 1 }],
  }),
  isrc: () => ({
    draw: `<path d="M0 -40V-16M0 16V40"/><circle r="16"/><path d="M0 -9V9M-4 3L0 9L4 3" class="arrow"/>`,
    pins: [{ x: 0, y: -40, dx: 0, dy: -1 }, { x: 0, y: 40, dx: 0, dy: 1 }],
  }),
  vcvs: () => ({
    draw: `<path d="M0 -40V-18M0 18V40M-30 -10H-18M-30 10H-18"/><path d="M0 -18L18 0L0 18L-18 0Z"/>`,
    pins: [
      { x: 0, y: -40, dx: 0, dy: -1 },
      { x: 0, y: 40, dx: 0, dy: 1 },
      { x: -30, y: -10, dx: -1, dy: 0 },
      { x: -30, y: 10, dx: -1, dy: 0 },
    ],
  }),
  subckt: (el) => {
    const n = el.nodes.length;
    const h = Math.max(40, n * 18);
    return {
      draw: `<rect x="-14" y="${-h / 2}" width="40" height="${h}"/>`,
      pins: el.nodes.map((_, i) => ({ x: -34, y: r1(-h / 2 + 9 + i * 18), dx: -1, dy: 0, stub: -14 })),
      extra: el.nodes.map((_, i) => `<path d="M-34 ${r1(-h / 2 + 9 + i * 18)}H-14"/>`).join(""),
    };
  },
  bjt: () => ({
    draw: `<path d="M-40 0H-12M-12 -14V14M-12 -6L10 -20V-40M-12 6L10 20V40"/>`,
    pins: [
      { x: 10, y: -40, dx: 0, dy: -1 },
      { x: -40, y: 0, dx: -1, dy: 0 },
      { x: 10, y: 40, dx: 0, dy: 1 },
    ],
  }),
};
SYMBOLS.vccs = SYMBOLS.vcvs;

function labelText(el) {
  switch (el.kind) {
    case "nmos":
    case "pmos":
      return [el.name, [el.params.w && `W=${el.params.w}`, el.params.l && `L=${el.params.l}`].filter(Boolean).join(" ")];
    case "res":
    case "cap":
    case "ind":
      return [el.name, el.value];
    case "vsrc":
    case "isrc":
      return [el.name, el.value];
    default:
      return [el.name, el.model ?? el.value ?? ""];
  }
}

/** Lukis pin: simbol bumi, bar VDD atau label net (boleh klik). */
function pinSvg(net, p, signalOk) {
  const stub = p.stub ?? 14;
  const ex = p.x + p.dx * stub;
  const ey = p.y + p.dy * stub;
  const line = `<path d="M${p.x} ${p.y}L${r1(ex)} ${r1(ey)}"/>`;
  if (isGround(net)) {
    return `${line}<g class="gnd" transform="translate(${r1(ex)} ${r1(ey)})"><path d="M0 0V0M-8 0H8M-5 3H5M-2 6H2" transform="rotate(${p.dy < 0 ? 180 : p.dx !== 0 ? (p.dx < 0 ? 90 : -90) : 0})"/></g>`;
  }
  if (isSupply(net)) {
    const rot = p.dy > 0 ? 180 : p.dx !== 0 ? (p.dx < 0 ? -90 : 90) : 0;
    const tx = p.dx < 0 ? ex - 6 : p.dx > 0 ? ex + 6 : ex;
    const ty = p.dy < 0 ? ey - 6 : p.dy > 0 ? ey + 14 : ey - 6;
    return (
      `${line}<g class="vdd" transform="translate(${r1(ex)} ${r1(ey)}) rotate(${rot})"><path d="M-8 0H8"/></g>` +
      `<text class="supply" x="${r1(tx)}" y="${r1(ty)}" text-anchor="${p.dx < 0 ? "end" : p.dx > 0 ? "start" : "middle"}">${esc(net.toUpperCase())}</text>`
    );
  }
  const tx = p.dx < 0 ? ex - 4 : p.dx > 0 ? ex + 4 : ex;
  const ty = p.dy < 0 ? ey - 4 : p.dy > 0 ? ey + 12 : ey + 4;
  const anchor = p.dx < 0 ? "end" : p.dx > 0 ? "start" : "middle";
  return (
    `${line}<g class="netlabel" data-net="${esc(net)}" tabindex="0" role="button" aria-label="Papar isyarat v(${esc(net)})">` +
    `<text x="${r1(tx)}" y="${r1(ty)}" text-anchor="${anchor}">${esc(net)}</text></g>`
  );
}

/**
 * @param {string} netlist
 * @param {{ layout?: Record<string,[number,number]> }} [opts]
 * @returns {{ svg: string, width: number, height: number, nets: string[], elements: number, warnings: string[] }}
 */
export function renderSchematic(netlist, opts = {}) {
  const graph = parseNetlist(netlist);
  const warnings = [];
  if (graph.elements.length === 0) {
    return { svg: "", width: 0, height: 0, nets: [], elements: 0, warnings: ["Tiada elemen untuk dilukis"] };
  }
  const lay = layoutGraph(graph, opts.layout ?? {});
  const W = lay.cols * CELL_W + MARGIN * 2;
  const H = lay.rows * CELL_H + MARGIN * 2;
  let body = "";
  for (const { el, col, row } of lay.items) {
    const sym = SYMBOLS[el.kind]?.(el);
    if (!sym) { warnings.push(`Simbol tiada untuk ${el.name}`); continue; }
    const cx = MARGIN + col * CELL_W + CELL_W / 2 - 10;
    const cy = MARGIN + row * CELL_H + CELL_H / 2;
    const order = sym.map ? ["g", "d", "s"] : null;
    let pins = "";
    sym.pins.forEach((p, i) => {
      // nmos/pmos: urutan pin simbol (g, d|s, s|d) dipetakan ke nod netlist (d g s b)
      let node;
      if (sym.map) node = el.nodes[{ g: 1, d: 0, s: 2 }[p.name]];
      else node = el.nodes[i] ?? el.nodes[0];
      pins += pinSvg(node, p);
    });
    void order;
    const [l1, l2] = labelText(el);
    const labx = el.kind === "subckt" ? 34 : 24;
    const bodyTxt = sym.body && sym.body !== el.nodes[2] ? ` b=${sym.body}` : "";
    body +=
      `<g class="el" data-el="${esc(el.name)}" transform="translate(${r1(cx)} ${r1(cy)})">` +
      `<g class="sym">${sym.draw}${sym.extra ?? ""}</g>${pins}` +
      `<text class="name" x="${labx}" y="-4">${esc(l1)}</text>` +
      (l2 || bodyTxt ? `<text class="val" x="${labx}" y="10">${esc(l2 + bodyTxt)}</text>` : "") +
      `</g>`;
  }
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" class="schem" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Skema litar">` +
    `<title>Skema litar</title>${body}</svg>`;
  return { svg, width: W, height: H, nets: graph.nets, elements: graph.elements.length, warnings };
}
