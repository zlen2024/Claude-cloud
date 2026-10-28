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
  {
    id: "nmos-family",
    title: "5. NMOS: keluarga Id lawan Vds (sapuan bersarang)",
    description:
      "Sapuan bersarang: Vds disapu 0 hingga 1.8V untuk setiap Vgs (0.6 hingga 1.8V). Setiap lengkung ialah satu Vgs. " +
      "Tambah isyarat -i(vd) untuk Id positif. Cari di mana lengkung mendatar (saturation) dan di mana ia melengkung (triode).",
    // W/L mesti bin yang sah: w=1 l=0.15 (lihat docs/engine-notes.md).
    netlist: `* SKY130 NMOS - keluarga Id vs Vds
${HEADER}

xm1 d g 0 0 sky130_fd_pr__nfet_01v8 w=1 l=0.15

vd d 0 0
vg g 0 0

* sapuan dalam: vd, sapuan luar: vg
.dc vd 0 1.8 0.05 vg 0.6 1.8 0.3
.end
`,
  },
  {
    id: "cs-ac",
    title: "6. Common-source: gandaan dan lebar jalur (AC)",
    description:
      "NMOS dengan beban perintang 20k dan kapasitor 100f. Vin = 0.8V DC + isyarat AC 1V, jadi v(out) terus ialah gandaan. " +
      "Lihat gandaan dalam dB dan frekuensi -3dB. Cuba ubah Rd dan Cl, dan perhatikan gandaan lawan lebar jalur.",
    // Hand calc: Vout(DC) ~ 1.29V => Id = (1.8-1.29)/20k = 25.5uA, gm ~ 2Id/(Vgs-Vth) ~ 2*25.5u/0.3 ~ 170uS
    // A0 = gm*(Rd||ro) ~ 4-6 (12-16 dB). f-3dB = 1/(2*pi*(Rd||ro)*Cl) ~ 80-160 MHz. Simulation: A0 = 13.98 dB.
    netlist: `* SKY130 common-source amplifier - AC
${HEADER}

xm1 out in 0 0 sky130_fd_pr__nfet_01v8 w=3 l=0.5
rd  vdd out 20k
cl  out 0 100f

vdd vdd 0 1.8
vin in 0 dc 0.8 ac 1

.ac dec 20 1 10G
.end
`,
  },
];

export const SCRATCH = {
  id: "scratch",
  title: "Scratch (netlist bebas)",
  description: "Ruang bebas untuk netlist sendiri. Pautan kongsi dibuka di sini.",
  netlist: `* Scratch
${HEADER}

* tulis litar anda di sini
xm1 d g 0 0 sky130_fd_pr__nfet_01v8 w=1 l=0.15
vd d 0 1.8
vg g 0 0

.dc vg 0 1.8 0.01
.end
`,
};
