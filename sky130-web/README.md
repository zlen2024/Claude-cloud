# SKY130 Analog Lab

Simulator analog yang jalan **terus dalam browser** (ngspice dalam WebAssembly) dengan model transistor **SkyWater SKY130**. Tak perlu Linux, Xschem atau install PDK. Sesuai untuk orang yang baru nak berjinak dengan analog IC design.

## Test

`npm test` (Vitest, semua lesson melalui engine), `npm run test:e2e` (Playwright). Set `PW_CHROMIUM` kalau nak guna binary Chromium sedia ada.

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

## Cara tambah lesson

Cipta folder `src/lessons/<id>/` dengan:

- `lesson.md`: frontmatter (`title`, `module` A-F, `order`) + teori BM, objektif dan tugasan.
- `circuit.cir`: litar permulaan. Mesti simulate tanpa ralat dan **gagal sekurang-kurangnya satu semakan** (itulah tugasan).
- `checks.js`: `export const checks = [{ id, label, run(result, h) => ({pass, actual, expected}), hints: [..maks 2] }]`.
  `h` ada `sig(name)`, `mag`, `phase`, `x`, `segments` dan semua fungsi dalam `src/measure.js`.
- `solution.cir`: penyelesaian. Mesti lulus semua semakan. Petunjuk ketiga ialah beza litar lawan penyelesaian.

Lesson dipungut automatik (`import.meta.glob`). `npm test` menjalankan setiap `circuit.cir` dan `solution.cir` melalui engine.
Komen dalam `checks.js` mesti merekod nilai rujukan daripada simulation dan pengiraan tangan.

## Kurikulum

| Modul | Lesson |
| --- | --- |
| A. MOSFET | Id-Vgs dan Vth, keluarga Id-Vds, PMOS lawan NMOS, gm dan gm/Id, modulasi panjang saluran |
| B. Inverter | VTC dan VM, margin hingar, kelewatan perambatan, ring oscillator |
| C. Penguat satu peringkat | common-source (perintang), common-source (beban arus), source follower, common-gate |
| D. Cermin arus dan rujukan | cermin asas, cascode, rujukan swa-bias |
| E. Pembeza dan op-amp | pasangan pembeza, OTA 5T, dua peringkat Miller, pengikut voltan (sambutan langkah) |

Modul F (PTAT/CTAT, bandgap, comparator, capstone) dijadualkan untuk v1.1. Peranti SKY130 yang tersedia: `docs/device-support.md`.
Perintang, kapasitor, sumber arus dan BJT dalam lesson ialah elemen SPICE ideal, **bukan** peranti SKY130.

## Tiga baris wajib untuk model SKY130

```spice
.param mc_switch=0          * matikan Monte Carlo (model PDK rujuk parameter ni)
.option scale=1.0u          * W dan L ditulis dalam mikron
.include modelcard.skywater * model SKY130 yang dibundle dalam engine
```

Tanpa `scale`, ngspice tak jumpa bin model yang sesuai ("could not find a valid modelname"). Tanpa `mc_switch`, parse model gagal.

## Fitur plot (Phase 3)

- Dua paksi Y: voltan (kiri), arus dan lain-lain (kanan). Chip legend tunjuk unit.
- Isyarat terbitan: taip ungkapan seperti `-i(vd)`, `v(out)-v(in)`, `deriv(v(out))`, `db(v(out))` (tiada `eval`).
- Sapuan `.dc` bersarang dilukis sebagai lengkung berasingan, dilabel ikut nilai sapuan luar.
- `.ac`: paparan Bode (gandaan dB dan fasa), dengan A0, f-3dB, fu dan margin fasa.
- Roda tetikus = zoom, seret = pan, dwiklik = reset. Butang A / B letak dua kursor (boleh diseret) dengan Δx dan Δy.
- Eksport CSV dan PNG.
- Perhatian bin W/L: lihat `docs/engine-notes.md` (contoh `w=2 l=0.5` tak sah).

## Editor (Phase 4)

CodeMirror 6 dengan highlight SPICE, nombor baris dan `Ctrl+Enter`. Ralat ngspice digaris bawah pada baris yang betul
(ralat dalam model PDK dilaporkan berasingan). Hint sebelum run: header SKY130 tak lengkap (satu klik "Tambah header"),
`m1` dengan model SKY130, W/L nampak seperti meter, tiada baris analisis. Suntingan disimpan automatik per lesson
(localStorage). Butang **Kongsi** letak netlist dalam URL hash (`#s=...`); membukanya memuat netlist ke **Scratch**.

## Had MVP (jujur)

- Tiada schematic editor. Input ialah netlist teks.
- Hanya model nfet/pfet 1.8V (nfet_01v8, pfet_01v8, pfet_01v8_hvt) yang disahkan di sini. Resistor, kapasitor dan BJT PDK belum diuji.
- Simulation jalan dalam Web Worker (ada butang Stop dan timeout 20s). Bundle ~20 MB (5.8 MB gzip).
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
