// Worker memegang satu instance Simulation. Protokol:
//   {type:"init"}              -> {type:"ready"}
//   {type:"run", id, netlist}  -> {type:"result", id, result, errors, ms} | {type:"error", id, message, errors}
import { Simulation } from "eecircuit-engine";

let sim = null;

async function ensure() {
  if (!sim) {
    sim = new Simulation();
    await sim.start();
  }
  return sim;
}

self.onmessage = async ({ data: msg }) => {
  if (msg.type === "init") {
    try {
      await ensure();
      self.postMessage({ type: "ready" });
    } catch (e) {
      self.postMessage({ type: "error", id: null, message: String(e?.message ?? e), errors: [] });
    }
    return;
  }
  if (msg.type !== "run") return;
  const { id, netlist } = msg;
  try {
    const s = await ensure();
    const t0 = performance.now();
    s.setNetList(netlist);
    const res = await s.runSim();
    const ms = Math.round(performance.now() - t0);
    const errors = s.getError().filter((l) => l.trim());
    const transfer = [];
    const data = res.data.map((d) => {
      if (res.dataType === "complex") return { name: d.name, type: d.type, values: d.values };
      const values = Float64Array.from(d.values);
      transfer.push(values.buffer);
      return { name: d.name, type: d.type, values };
    });
    const result = { ...res, data };
    self.postMessage({ type: "result", id, result, errors, ms }, transfer);
  } catch (e) {
    let errors = [];
    try {
      errors = sim.getError().filter((l) => l.trim());
    } catch {}
    self.postMessage({ type: "error", id, message: String(e?.message ?? e), errors });
  }
};
