/** Pecahkan "---\nkey: value\n---\nbody" kepada {meta, body}. Nilai nombor ditukar kepada Number. */
export function parseFrontmatter(src) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(src);
  if (!m) return { meta: {}, body: src };
  const meta = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = /^([\w-]+):\s*(.*)$/.exec(line);
    if (kv) meta[kv[1]] = /^-?\d+(\.\d+)?$/.test(kv[2]) ? Number(kv[2]) : kv[2].trim();
  }
  return { meta, body: m[2] };
}
