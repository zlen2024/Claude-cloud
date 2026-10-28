// Petua lint sebelum run. Pulang [{line, severity, message, fix?}], line bermula 1 (0 = seluruh netlist).

export const HEADER_LINES = [
  ".param mc_switch=0",
  ".option scale=1.0u",
  ".include modelcard.skywater",
];

const has = {
  mc: (t) => /^\s*\.param\s+mc_switch\s*=/im.test(t),
  scale: (t) => /^\s*\.option\s+.*\bscale\s*=\s*1(\.0*)?u\b/im.test(t),
  include: (t) => /^\s*\.include\s+["']?modelcard\.skywater/im.test(t),
};

/** Sisip tiga baris wajib selepas baris tajuk (baris pertama), melangkau yang sudah ada. */
export function addSkyHeader(text) {
  const missing = [];
  if (!has.mc(text)) missing.push(HEADER_LINES[0]);
  if (!has.scale(text)) missing.push(HEADER_LINES[1]);
  if (!has.include(text)) missing.push(HEADER_LINES[2]);
  if (!missing.length) return text;
  const lines = text.split("\n");
  lines.splice(1, 0, ...missing);
  return lines.join("\n");
}

export function lintNetlist(text) {
  const out = [];
  const lines = text.split(/\r?\n/);
  const usesSky = /sky130_fd_pr__/i.test(text);

  if (usesSky && !(has.mc(text) && has.scale(text) && has.include(text))) {
    out.push({
      line: 0, severity: "warning", fixId: "header",
      message: "Tiga baris wajib SKY130 tidak lengkap (.param mc_switch=0, .option scale=1.0u, .include modelcard.skywater)",
    });
  }
  if (!lines.some((l) => /^\s*\.(dc|tran|ac|op)\b/i.test(l))) {
    out.push({ line: 0, severity: "warning", message: "Tiada baris analisis (.dc, .tran, .ac atau .op)" });
  }
  lines.forEach((l, i) => {
    const n = i + 1;
    if (/^\s*m\w*\s/i.test(l) && /sky130_fd_pr__/i.test(l)) {
      out.push({
        line: n, severity: "warning",
        message: "Model SKY130 ialah subcircuit: guna nama bermula 'x' (contoh xm1), bukan 'm'",
      });
    }
    if (usesSky && /^\s*x/i.test(l)) {
      for (const m of l.matchAll(/\b([wl])\s*=\s*([0-9.]+e-[0-9]+)/gi)) {
        const v = parseFloat(m[2]);
        if (v < 1e-3) {
          out.push({
            line: n, severity: "warning",
            message: `${m[1]}=${m[2]} nampak seperti meter, tetapi scale=1u bermakna unit ialah mikron (contoh ${m[1]}=${Number((v * 1e6).toPrecision(3))})`,
          });
        }
      }
    }
  });
  return out;
}
