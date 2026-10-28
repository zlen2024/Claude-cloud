// Setiap lesson = satu netlist ngspice yang boleh diedit oleh pelajar.
// Tiga baris pertama (mc_switch, scale, include) wajib untuk model SKY130:
//   .param mc_switch=0        -> matikan Monte Carlo (model PDK rujuk parameter ni)
//   .option scale=1.0u        -> W dan L ditulis dalam mikron (um)
//   .include modelcard.skywater -> model SKY130 yang dibundle dalam engine

const HEADER = `.param mc_switch=0
.option scale=1.0u
.include modelcard.skywater`;

export const LESSONS = [
  {
    id: "inverter-vtc",
    title: "1. Inverter CMOS: Voltage Transfer Curve (VTC)",
    description:
      "Inverter paling asas: satu NMOS + satu PMOS. Sapu Vin dari 0 ke 1.8V dan tengok Vout. " +
      "Cuba ubah W PMOS (xm2) dan perhatikan titik switching bergerak. Soalan: pada Vin berapa Vout = Vin?",
    netlist: `* SKY130 inverter - VTC (DC sweep)
${HEADER}

* xm<nama> drain gate source bulk model W L  (unit um)
xm1 out in 0   0   sky130_fd_pr__nfet_01v8 w=0.42 l=0.15
xm2 out in vdd vdd sky130_fd_pr__pfet_01v8 w=1.0  l=0.15

vdd vdd 0 1.8
vin in  0 0

.dc vin 0 1.8 0.01
.end
`,
  },
  {
    id: "inverter-tran",
    title: "2. Inverter CMOS: Transient (delay)",
    description:
      "Bagi input pulse dan tengok output bertukar. Cl = beban kapasitor 20fF. " +
      "Ukur propagation delay (masa dari Vin = 0.9V ke Vout = 0.9V). Cuba besarkan Cl dan lihat delay bertambah.",
    netlist: `* SKY130 inverter - transient
${HEADER}

xm1 out in 0   0   sky130_fd_pr__nfet_01v8 w=0.42 l=0.15
xm2 out in vdd vdd sky130_fd_pr__pfet_01v8 w=1.0  l=0.15
cl  out 0 20f

vdd vdd 0 1.8
vin in  0 pulse(0 1.8 1n 0.1n 0.1n 5n 10n)

.tran 0.01n 30n
.end
`,
  },
  {
    id: "nmos-idvg",
    title: "3. NMOS: Id lawan Vgs",
    description:
      "Satu transistor NMOS, Vds tetap 1.8V, sapu Vgs. Arus mengalir keluar dari drain jadi i(vd) negatif (konvensyen SPICE), " +
      "maksudnya Id = -i(vd). Cari Vth: Vgs di mana arus mula naik mendadak.",
    netlist: `* SKY130 NMOS - Id vs Vgs
${HEADER}

xm1 d g 0 0 sky130_fd_pr__nfet_01v8 w=1 l=0.15

vd d 0 1.8
vg g 0 0

.dc vg 0 1.8 0.01
.end
`,
  },
  {
    id: "pmos-idvg",
    title: "4. PMOS: Id lawan Vsg",
    description:
      "PMOS diletak terbalik: source ke VDD, gate disapu dari 1.8V turun ke 0. " +
      "Bandingkan magnitud arus dengan NMOS yang sama saiz. Kenapa PMOS dalam inverter perlu W lebih besar?",
    netlist: `* SKY130 PMOS - Id vs Vsg
${HEADER}

xm1 d g vdd vdd sky130_fd_pr__pfet_01v8 w=1 l=0.15

vdd vdd 0 1.8
vd  d   0 0
vg  g   0 1.8

.dc vg 1.8 0 -0.01
.end
`,
  },
];
