# SKY130 Analog Lab

Simulator analog yang jalan **terus dalam browser** (ngspice dalam WebAssembly) dengan model transistor **SkyWater SKY130**. Tak perlu Linux, Xschem atau install PDK. Sesuai untuk orang yang baru nak berjinak dengan analog IC design.

## Cara run (Windows)

1. Install **Node.js LTS** dari https://nodejs.org
2. Unzip projek ni, buka PowerShell dalam folder tu
3. Jalankan:

```powershell
npm install
npm run dev
```

4. Buka http://localhost:5173 dalam Chrome atau Edge. Tekan **Run** (atau `Ctrl+Enter`).

Perintah lain:

| Perintah | Fungsi |
| --- | --- |
| `npm run smoke` | Jalankan semua lesson dalam Node dan semak keputusan masuk akal |
| `npm run build` | Hasilkan folder `dist/` yang boleh di-host (GitHub Pages dll.) |

## Lesson sekarang

1. Inverter CMOS: VTC (DC sweep)
2. Inverter CMOS: transient dan delay
3. NMOS: Id lawan Vgs
4. PMOS: Id lawan Vsg

Lesson ada dalam `src/lessons.js`. Nak tambah lesson, tambah satu objek `{ id, title, description, netlist }`.

## Tiga baris wajib untuk model SKY130

```spice
.param mc_switch=0          * matikan Monte Carlo (model PDK rujuk parameter ni)
.option scale=1.0u          * W dan L ditulis dalam mikron
.include modelcard.skywater * model SKY130 yang dibundle dalam engine
```

Tanpa `scale`, ngspice tak jumpa bin model yang sesuai ("could not find a valid modelname"). Tanpa `mc_switch`, parse model gagal.

## Had MVP (jujur)

- Tiada schematic editor. Input ialah netlist teks.
- Hanya model nfet/pfet 1.8V (nfet_01v8, pfet_01v8, pfet_01v8_hvt) yang disahkan di sini. Resistor, kapasitor dan BJT PDK belum diuji.
- Analisis AC belum diplot. Nested sweep (`.dc` dua pembolehubah) belum diplot dengan betul.
- Plot guna satu paksi Y, jadi pilih sama ada voltan atau arus pada satu masa.
- Simulation jalan atas thread utama browser, jadi UI beku sekejap semasa run. Bundle ~20 MB (5.8 MB gzip).
- UI belum diuji secara visual dalam browser oleh pembina. Engine dan semua lesson diuji dalam Node (`npm run smoke`) dan build Vite berjaya.

## Idea seterusnya

- Pindah engine ke Web Worker, kurangkan beku UI
- Plot dua paksi Y, dan sokong AC (Bode) dan nested sweep (famili Id-Vds)
- Lesson: current mirror, diff pair, common-source amp, bandgap
- Schematic viewer, lepas tu editor ringkas
- Cabaran dengan semakan automatik ("capai gain > 20 dB")

## Lesen dan kredit

- Engine: [eecircuit-engine](https://github.com/eelab-dev/EEcircuit-engine) oleh Danial Chitnis (MIT), berasaskan ngspice
- Model: SkyWater SKY130 PDK (Apache-2.0), dibundle dalam engine di atas
