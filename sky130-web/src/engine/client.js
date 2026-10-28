// API promise untuk worker engine. Satu request pada satu masa.
// Stop / timeout = terminate worker dan cipta yang baru (ngspice-wasm tak boleh diinterupsi).

import workerUrl from "./worker.js?worker&url";

export class EngineBusyError extends Error {}
export class EngineAbortError extends Error {
  constructor(reason) {
    super(reason === "timeout" ? "Simulation melebihi had masa" : "Engine dimulakan semula");
    this.reason = reason; // "stop" | "timeout"
  }
}

export class Engine {
  constructor({ timeoutMs = 20000, workerFactory } = {}) {
    this.timeoutMs = timeoutMs;
    this.workerFactory = workerFactory ?? (() => new Worker(workerUrl, { type: "module" }));
    this.worker = null;
    this.ready = null;
    this.pending = null; // { id, resolve, reject, timer }
    this.nextId = 1;
  }

  get busy() {
    return this.pending !== null;
  }

  _spawn() {
    this.worker = this.workerFactory();
    this.ready = new Promise((resolve, reject) => {
      this._readyReject = reject;
      this.worker.onmessage = ({ data: msg }) => {
        if (msg.type === "ready") return resolve();
        const p = this.pending;
        if (msg.type === "error" && msg.id === null) return reject(new Error(msg.message));
        if (!p || msg.id !== p.id) return;
        clearTimeout(p.timer);
        this.pending = null;
        if (msg.type === "result") p.resolve(msg);
        else p.reject(Object.assign(new Error(msg.message), { errors: msg.errors }));
      };
      this.worker.onerror = (e) => {
        const err = new Error(e.message || "Worker error");
        reject(err);
        this._fail(err);
      };
    });
    this.ready.catch(() => {});
    this.worker.postMessage({ type: "init" });
  }

  _fail(err) {
    const p = this.pending;
    if (!p) return;
    clearTimeout(p.timer);
    this.pending = null;
    p.reject(err);
  }

  /** Buang worker sekarang dan mulakan yang baru. Request yang sedang jalan ditolak. */
  restart(reason = "stop") {
    this.worker?.terminate();
    this.worker = null;
    this.ready = null;
    this._fail(new EngineAbortError(reason));
  }

  stop() {
    this.restart("stop");
  }

  /** Resolve {result, errors, ms}. Reject EngineBusyError / EngineAbortError / Error. */
  async run(netlist, { timeoutMs = this.timeoutMs } = {}) {
    if (this.pending) throw new EngineBusyError("Simulation lain sedang jalan");
    if (!this.worker) this._spawn();
    const id = this.nextId++;
    const done = new Promise((resolve, reject) => {
      this.pending = { id, resolve, reject, timer: null };
    });
    // timeout bermula selepas engine siap dimuat (muat awal ~20 MB tak dikira)
    done.catch(() => {});
    try {
      await Promise.race([this.ready, done]); // done menolak kalau di-stop semasa loading
    } catch (e) {
      if (e instanceof EngineAbortError) throw e;
      this._fail(e);
      this.worker = null;
      throw e;
    }
    const p = this.pending;
    p.timer = setTimeout(() => this.restart("timeout"), timeoutMs);
    this.worker.postMessage({ type: "run", id, netlist });
    return done;
  }
}
