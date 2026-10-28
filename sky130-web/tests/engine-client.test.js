import { describe, it, expect, vi } from "vitest";
import { Engine, EngineAbortError, EngineBusyError } from "../src/engine/client.js";

function fakeWorkerFactory(onRun) {
  const workers = [];
  const factory = () => {
    const w = {
      terminated: false,
      onmessage: null,
      postMessage(msg) {
        if (msg.type === "init") queueMicrotask(() => w.onmessage({ data: { type: "ready" } }));
        if (msg.type === "run") onRun?.(w, msg);
      },
      terminate() {
        w.terminated = true;
      },
    };
    workers.push(w);
    return w;
  };
  return { factory, workers };
}

describe("Engine client", () => {
  it("resolve result", async () => {
    const { factory } = fakeWorkerFactory((w, m) =>
      w.onmessage({ data: { type: "result", id: m.id, result: { ok: 1 }, errors: [], ms: 5 } }),
    );
    const e = new Engine({ workerFactory: factory });
    expect((await e.run("x")).result).toEqual({ ok: 1 });
    expect(e.busy).toBe(false);
  });

  it("tolak request kedua semasa busy", async () => {
    const { factory } = fakeWorkerFactory();
    const e = new Engine({ workerFactory: factory });
    const p = e.run("a");
    p.catch(() => {});
    await expect(e.run("b")).rejects.toBeInstanceOf(EngineBusyError);
    e.stop();
    await expect(p).rejects.toBeInstanceOf(EngineAbortError);
  });

  it("stop terminate worker dan run seterusnya guna worker baru", async () => {
    const { factory, workers } = fakeWorkerFactory((w, m) => {
      if (workers.length > 1) w.onmessage({ data: { type: "result", id: m.id, result: 2, errors: [], ms: 1 } });
    });
    const e = new Engine({ workerFactory: factory });
    const p = e.run("a");
    p.catch(() => {});
    await new Promise((r) => setTimeout(r, 5));
    e.stop();
    expect(workers[0].terminated).toBe(true);
    await expect(p).rejects.toMatchObject({ reason: "stop" });
    expect((await e.run("b")).result).toBe(2);
  });

  it("timeout", async () => {
    vi.useFakeTimers();
    const { factory } = fakeWorkerFactory();
    const e = new Engine({ workerFactory: factory, timeoutMs: 100 });
    const p = e.run("a");
    const assertion = expect(p).rejects.toMatchObject({ reason: "timeout" });
    await vi.advanceTimersByTimeAsync(200);
    await assertion;
    vi.useRealTimers();
  });
});
