---
title: Common-source dengan beban perintang
module: C
order: 1
---
# Common-source: gandaan dan lebar jalur

**Objektif:** baca gandaan AC dan frekuensi -3 dB, dan fahami pertukaran gandaan lawan lebar jalur.

## Teori ringkas
Pada isyarat kecil, A0 = -gm · (Rd ∥ ro). Kutub keluaran ialah f-3dB = 1 / (2π · (Rd ∥ ro) · Cl).
Menaikkan Rd menaikkan gandaan tetapi menurunkan lebar jalur: hasil darab gandaan dan lebar jalur lebih kurang tetap.
Isyarat AC 1 V pada `vin` menjadikan `v(out)` terus bersamaan dengan gandaan. Fasa pada frekuensi rendah ialah 180° (penguat songsang).

Rd yang terlalu besar menggerakkan titik DC output ke bawah (Id · Rd menurun Vout) dan transistor boleh jatuh keluar dari saturation.

## Tugasan
1. Jalankan dan lihat plot Bode untuk `v(out)`. Baca A0 dan f-3dB.
2. Naikkan gandaan kepada lebih 18 dB dengan menukar **Rd**, tetapi simpan f-3dB melebihi 20 MHz.
