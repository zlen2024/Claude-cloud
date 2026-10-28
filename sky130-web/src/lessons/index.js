// Pendaftaran lesson: setiap folder src/lessons/<id>/ ada lesson.md, circuit.cir, checks.js dan solution.cir pilihan.
import { parseFrontmatter } from "../frontmatter.js";

const md = import.meta.glob("./*/lesson.md", { query: "?raw", import: "default", eager: true });
const cir = import.meta.glob("./*/circuit.cir", { query: "?raw", import: "default", eager: true });
const sol = import.meta.glob("./*/solution.cir", { query: "?raw", import: "default", eager: true });
const chk = import.meta.glob("./*/checks.js", { eager: true });

export const MODULES = {
  A: "MOSFET",
  B: "Inverter (digital bertemu analog)",
  C: "Penguat satu peringkat",
  D: "Cermin arus dan rujukan",
  E: "Pembeza dan op-amp",
  F: "Ke arah blok sebenar",
};

const HEADER = `.param mc_switch=0
.option scale=1.0u
.include modelcard.skywater`;

export const LESSONS = Object.keys(md)
  .map((path) => {
    const dir = path.replace("./", "").replace("/lesson.md", "");
    const { meta, body } = parseFrontmatter(md[path]);
    return {
      id: dir,
      title: meta.title ?? dir,
      module: meta.module ?? "A",
      order: meta.order ?? 0,
      md: body,
      netlist: cir[`./${dir}/circuit.cir`],
      solution: sol[`./${dir}/solution.cir`] ?? null,
      checks: chk[`./${dir}/checks.js`]?.checks ?? [],
    };
  })
  .sort((a, b) => a.module.localeCompare(b.module) || a.order - b.order);

export const SCRATCH = {
  id: "scratch",
  title: "Scratch (netlist bebas)",
  md: "# Scratch\n\nRuang bebas untuk netlist sendiri. Pautan kongsi dibuka di sini.",
  netlist: `* Scratch
${HEADER}

* tulis litar anda di sini
xm1 d g 0 0 sky130_fd_pr__nfet_01v8 w=1 l=0.15
vd d 0 1.8
vg g 0 0

.dc vg 0 1.8 0.01
.end
`,
  solution: null,
  checks: [],
};
