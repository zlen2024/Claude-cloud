---
title: Common-gate
module: C
order: 4
---
# Common-gate

**Objektif:** kenal bentuk common-gate: input pada source, gandaan tak songsang, rintangan masukan rendah.

## Teori ringkas
Gate dipegang pada voltan DC tetap (AC ground). Isyarat masuk melalui source dan keluar pada drain.
Peningkatan Vin menurunkan Vgs jadi arus turun dan Vout naik: **gandaan positif** (fasa 0°).
Gandaan A0 ≈ (gm + gmb) · (Rd ∥ ro). Rintangan masukan ≈ 1/gm, rendah, sesuai untuk menyambung punca arus.
Kutub keluaran ialah 1/(2π · Rd · Cl) seperti common-source.

Di sini Vg = 1.0 V dan Vin DC = 0.1 V memberi Vgs = 0.9 V.

## Tugasan
1. Jalankan, sahkan fasa 0° dan baca A0.
2. Naikkan A0 melebihi 16 dB dengan menukar Rd. Pastikan transistor kekal dalam saturation (Vout tidak jatuh di bawah Vg - Vth ≈ 0.3 V).
   f-3dB mesti kekal melebihi 50 MHz.
