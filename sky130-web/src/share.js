import LZString from "lz-string";

/** Hash URL bagi netlist: "#s=<lz-string>". */
export const encodeShare = (text) => `#s=${LZString.compressToEncodedURIComponent(text)}`;

/** Netlist daripada hash, atau null kalau bukan pautan kongsi / rosak. */
export function decodeShare(hash) {
  const m = /^#s=(.+)$/.exec(hash ?? "");
  if (!m) return null;
  try {
    const t = LZString.decompressFromEncodedURIComponent(m[1]);
    return t ? t : null;
  } catch {
    return null;
  }
}
