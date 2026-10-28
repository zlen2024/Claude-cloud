// Penghurai subset netlist SPICE untuk paparan skema: R C L V I E, M, X (subcircuit MOSFET), Q.

const GND = new Set(["0", "gnd", "vss"]);
const SUPPLY = /^(vdd|vcc|avdd|dvdd)\w*$/i;

export const normNet = (n) => (GND.has(n.toLowerCase()) ? "0" : n.toLowerCase());
export const isGround = (n) => n === "0";
export const isSupply = (n) => SUPPLY.test(n);

const KIND = { r: "res", c: "cap", l: "ind", v: "vsrc", i: "isrc", e: "vcvs", g: "vccs", q: "bjt" };

/** @returns {{elements: {name,kind,nodes:string[],value?:string,model?:string,params:Record<string,string>}[], nets: string[]}} */
export function parseNetlist(text) {
  const raw = text.split(/\r?\n/);
  const lines = [];
  for (const l of raw) {
    if (/^\s*\+/.test(l) && lines.length) lines[lines.length - 1] += " " + l.replace(/^\s*\+/, "");
    else lines.push(l);
  }
  const elements = [];
  // baris pertama ialah tajuk SPICE, bukan elemen
  for (const line of lines.slice(1)) {
    const t = line.split(";")[0].trim();
    if (!t || t[0] === "*" || t[0] === ".") continue;
    const tok = t.split(/\s+/);
    const name = tok[0].toLowerCase();
    const letter = name[0];
    const params = {};
    const pos = [];
    for (const x of tok.slice(1)) {
      const m = /^([a-z_]\w*)=(.+)$/i.exec(x);
      if (m) params[m[1].toLowerCase()] = m[2];
      else pos.push(x);
    }
    let el = null;
    if ("rcl".includes(letter) && pos.length >= 3) {
      el = { name, kind: KIND[letter], nodes: pos.slice(0, 2).map(normNet), value: pos[2] };
    } else if ("vi".includes(letter) && pos.length >= 2) {
      el = { name, kind: KIND[letter], nodes: pos.slice(0, 2).map(normNet), value: pos.slice(2).join(" ") };
    } else if ("eg".includes(letter) && pos.length >= 5) {
      el = { name, kind: KIND[letter], nodes: pos.slice(0, 4).map(normNet), value: pos[4] };
    } else if (letter === "q" && pos.length >= 4) {
      el = { name, kind: "bjt", nodes: pos.slice(0, 3).map(normNet), model: pos[3] };
    } else if (letter === "m" && pos.length >= 5) {
      el = { name, kind: mosKind(pos[4]), nodes: pos.slice(0, 4).map(normNet), model: pos[4] };
    } else if (letter === "x" && pos.length >= 2) {
      const model = pos[pos.length - 1];
      const nodes = pos.slice(0, -1).map(normNet);
      const kind = nodes.length === 4 ? mosKind(model) : "subckt";
      el = { name, kind, nodes, model };
    }
    if (el) elements.push({ params, ...el });
  }
  const nets = [...new Set(elements.flatMap((e) => e.nodes))].filter((n) => !isGround(n));
  return { elements, nets };
}

function mosKind(model) {
  if (/nfet|nmos/i.test(model)) return "nmos";
  if (/pfet|pmos/i.test(model)) return "pmos";
  return "subckt";
}
