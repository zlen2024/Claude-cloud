# Sokongan peranti dalam `modelcard.skywater` (eecircuit-engine 1.9)

Diuji dengan satu netlist `.op` bagi setiap peranti, dengan tiga baris wajib SKY130.

| Peranti | Status | Nota |
| --- | --- | --- |
| `sky130_fd_pr__nfet_01v8` | OK | Bin W/L, lihat `engine-notes.md`. |
| `sky130_fd_pr__pfet_01v8` | OK | Bin W/L, lihat `engine-notes.md`. |
| `sky130_fd_pr__pfet_01v8_hvt` | OK | Diuji W=1 L=0.15 dan L=0.5. Bin lain tidak diuji. |
| `sky130_fd_pr__nfet_01v8_lvt` | TIADA | `unknown subckt`. |
| `sky130_fd_pr__nfet_g5v0d10v5` (5 V) | TIADA | `unknown subckt`. |
| `sky130_fd_pr__res_xhigh_po_0p35`, `res_high_po_0p35` | TIADA | `unknown subckt`. |
| `sky130_fd_pr__cap_mim_m3_1` | TIADA | `unknown subckt`. |
| `sky130_fd_pr__pnp_05v5_W3p40L3p40`, `npn_05v5_W1p00L1p00` | TIADA | `unknown subckt`. |
| `R`, `C`, `L` SPICE ideal | OK | Elemen ideal. |
| `Q` SPICE dengan `.model` sendiri | OK | Model BJT generik, **bukan** SKY130. |

Bundle hanya mengandungi `nfet18`, `pfet18`, `pfet18_hvt` dan `params` (lihat `node_modules/eecircuit-engine/dist/models/skywater`).

## Peraturan untuk lesson
- Perintang, kapasitor dan sumber arus dalam lesson ialah **elemen SPICE ideal**. Jangan dakwa ia peranti SKY130.
- BJT (untuk PTAT/CTAT dan bandgar dalam Modul F) menggunakan `Q` dengan `.model` generik. Lesson mesti menyatakan ini dengan jelas.
- Hanya nfet_01v8, pfet_01v8 dan pfet_01v8_hvt ialah peranti SKY130 sebenar dalam kursus ini.
