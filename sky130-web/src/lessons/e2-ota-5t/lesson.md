---
title: OTA 5 transistor
module: E
order: 2
---
# OTA 5 transistor

**Objektif:** ukur gandaan dan lebar jalur OTA satu peringkat.

## Teori ringkas
OTA ini ialah pasangan pembeza NMOS dengan beban cermin arus PMOS. Cermin menukar isyarat pembeza dua cabang kepada
satu keluaran tunggal. Gandaan A0 = gm1 · (ro2 ∥ ro4). Dengan beban kapasitif Cl, frekuensi gandaan unit
fu ≈ gm1 / (2π · Cl) dan ia satu-kutub, jadi margin fasa hampir 90°.

Menaikkan W input (pada Iss tetap) menaikkan gm/Id, jadi gm dan A0 serta fu naik.
Sumber ekor `iss` ialah sumber SPICE ideal.

## Tugasan
1. Jalankan dan baca A0, f-3dB, fu dan margin fasa daripada garis maklumat.
2. Naikkan W input supaya A0 lebih 35 dB dan fu lebih 20 MHz.
