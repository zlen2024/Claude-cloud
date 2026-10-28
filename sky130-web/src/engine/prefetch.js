// Muat turun skrip worker (termasuk ~20 MB engine) lebih awal dengan laporan bait, supaya pengguna nampak kemajuan.
// Selepas ini Worker mengambil fail yang sama daripada cache (HTTP/service worker).
import workerUrl from "./worker.js?worker&url";

export async function prefetchEngine(onProgress) {
  try {
    const res = await fetch(workerUrl);
    if (!res.body) return;
    const reader = res.body.getReader();
    let n = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      n += value.length;
      onProgress?.(n);
    }
  } catch {
    // gagal prefetch bukan ralat: Worker akan cuba sendiri
  }
}
