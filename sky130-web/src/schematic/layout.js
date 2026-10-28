// Auto-layout: lajur ikut aliran isyarat (BFS dari sumber), baris ikut urutan netlist.
// Rel bekalan dan bumi dilukis sebagai simbol di setiap pin (konvensyen skema), bukan wayar panjang.
import { isGround, isSupply } from "./parse.js";

export const CELL_W = 180;
export const CELL_H = 150;
export const MARGIN = 24;

/**
 * @param graph keluaran parseNetlist
 * @param override optional { elemName: [col, row] } (layout.json)
 * @returns {{ items: {el, col, row}[], cols: number, rows: number }}
 */
export function layoutGraph(graph, override = {}) {
  const els = graph.elements;
  const rail = (n) => isGround(n) || isSupply(n);
  const byNet = new Map();
  els.forEach((e, i) => {
    for (const n of e.nodes) if (!rail(n)) (byNet.get(n) ?? byNet.set(n, []).get(n)).push(i);
  });
  const depth = new Array(els.length).fill(-1);
  const queue = [];
  els.forEach((e, i) => {
    if (e.kind === "vsrc" || e.kind === "isrc") {
      depth[i] = 0;
      queue.push(i);
    }
  });
  const bfs = () => {
    while (queue.length) {
      const i = queue.shift();
      for (const n of els[i].nodes) {
        if (rail(n)) continue;
        for (const j of byNet.get(n) ?? []) {
          if (depth[j] < 0) {
            depth[j] = depth[i] + 1;
            queue.push(j);
          }
        }
      }
    }
  };
  bfs();
  // komponen tanpa sumber (contoh ring oscillator): mulakan daripada elemen pertama yang belum dilawati
  for (let i = 0; i < els.length; i++) {
    if (depth[i] < 0) {
      depth[i] = 0;
      queue.push(i);
      bfs();
    }
  }
  const colRows = new Map();
  const items = els.map((el, i) => {
    let col = depth[i];
    let row;
    if (override[el.name]) [col, row] = override[el.name];
    else {
      row = colRows.get(col) ?? 0;
      colRows.set(col, row + 1);
    }
    return { el, col, row };
  });
  // baris override tidak mengubah kaunter auto; pastikan tiada pertindihan sel
  const seen = new Set();
  for (const it of items) {
    while (seen.has(`${it.col},${it.row}`)) it.row++;
    seen.add(`${it.col},${it.row}`);
  }
  return {
    items,
    cols: Math.max(0, ...items.map((i) => i.col)) + 1,
    rows: Math.max(0, ...items.map((i) => i.row)) + 1,
  };
}
