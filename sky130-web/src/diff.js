/** Beza baris (LCS). Pulang [{type:"same"|"add"|"del", text}]. */
export function lineDiff(a, b) {
  const x = a.split("\n"), y = b.split("\n");
  const n = x.length, m = y.length;
  const L = Array.from({ length: n + 1 }, () => new Int32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--)
    L[i][j] = x[i] === y[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const out = [];
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (x[i] === y[j]) { out.push({ type: "same", text: x[i] }); i++; j++; }
    else if (L[i + 1][j] >= L[i][j + 1]) out.push({ type: "del", text: x[i++] });
    else out.push({ type: "add", text: y[j++] });
  }
  while (i < n) out.push({ type: "del", text: x[i++] });
  while (j < m) out.push({ type: "add", text: y[j++] });
  return out;
}

/** Hanya baris yang berubah, dalam format "- lama / + baru". */
export function diffText(a, b) {
  return lineDiff(a, b)
    .filter((d) => d.type !== "same")
    .map((d) => (d.type === "add" ? "+ " : "- ") + d.text)
    .join("\n");
}
