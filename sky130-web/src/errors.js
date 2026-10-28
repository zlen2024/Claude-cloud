// Tukar baris error ngspice kepada diagnostik pada baris netlist pengguna.
// Format yang dikenali (lihat docs/engine-notes.md):
//   "Error: <mesej>" + "    in line no. N from file ..."   (N = baris netlist pengguna, bermula 1)
//   "Error on line N or its substitute:" + "  <teks baris>" + "<mesej>"  (N boleh jauh lebih besar: baris dalam model PDK)
//   "Warning: 'r1 a' is not a valid resistor instance line, ignored!"
//   'Fatal error: ... named "vx" is not in the circuit'

export const PDK_MESSAGE = "Ralat dalam model PDK. Semak tiga baris wajib SKY130";
const BIN_MESSAGE = "Tiada bin SKY130 untuk kombinasi W/L ini. Cuba W = 1, 3, 5 atau 7 (lihat docs/engine-notes.md)";

const norm = (s) => s.trim().replace(/\s+/g, " ").toLowerCase();

/**
 * @returns {{ diagnostics: {line:number, message:string, severity:"error"|"warning"}[], pdk: boolean, other: string[] }}
 */
export function parseNgspiceErrors(errors, netlist) {
  const lines = netlist.split(/\r?\n/);
  const count = lines.length;
  const diagnostics = [];
  const other = [];
  let pdk = false;
  const add = (line, message, severity = "error") => {
    if (!diagnostics.some((d) => d.line === line && d.message === message)) diagnostics.push({ line, message, severity });
  };
  const findLine = (pred) => lines.findIndex(pred) + 1 || null;

  for (let i = 0; i < errors.length; i++) {
    const l = errors[i];
    let m;
    if ((m = /^Error: (.+)/.exec(l)) && /in line no\. (\d+)/.test(errors[i + 1] ?? "")) {
      add(Number(/in line no\. (\d+)/.exec(errors[i + 1])[1]), m[1]);
    } else if ((m = /^Error on line (\d+) or its substitute/.exec(l))) {
      const n = Number(m[1]);
      const echo = (errors[i + 1] ?? "").trim();
      const msg = (errors[i + 2] ?? "").trim() || "Ralat";
      const text = /valid modelname/.test(msg) ? BIN_MESSAGE : msg;
      let target = n <= count && norm(lines[n - 1]) === norm(echo) ? n : null;
      if (!target) target = findLine((x) => norm(x) === norm(echo));
      if (!target) {
        const inst = /^m\.(x[^.\s]+)\./i.exec(echo)?.[1];
        if (inst) target = findLine((x) => x.trim().toLowerCase().startsWith(inst.toLowerCase() + " "));
      }
      if (target) add(target, text);
      else pdk = true;
    } else if ((m = /^Warning: '(.+)' is not a valid/.exec(l))) {
      const target = findLine((x) => norm(x).startsWith(norm(m[1])));
      if (target) add(target, l.replace(/^Warning: /, ""), "warning");
      else other.push(l);
    } else if ((m = /named "([^"]+)" is not in the circuit/.exec(l))) {
      const target = findLine((x) => /^\s*\.(dc|step)\b/i.test(x) && x.toLowerCase().includes(m[1].toLowerCase()));
      if (target) add(target, `Sumber '${m[1]}' tiada dalam litar`);
      else other.push(l);
    } else if ((m = /^Error: unknown subckt: (.+)/.exec(l))) {
      const target = findLine((x) => norm(x) === norm(m[1]));
      if (target) add(target, "Subcircuit/model tak dikenali. Semak tiga baris wajib SKY130 dan nama model");
      else other.push(l);
    } else if (l.trim() && !/^\s*(in line no|Simulation interrupted|Command 'remcirc'|Warning: there is no circuit)/.test(l)) {
      other.push(l);
    }
  }
  return { diagnostics, pdk, other };
}
