---
title: NMOS Id lawan Vgs dan Vth
module: A
order: 1
---
# NMOS: Id lawan Vgs

**Objektif:** lihat bagaimana arus drain bergantung pada Vgs dan ekstrak voltan ambang (Vth).

## Teori ringkas
Di bawah Vth transistor hampir mati. Di atas Vth, arus naik dengan Vgs. Kaedah **ekstrapolasi linear**: cari titik di mana
kecerunan (gm) paling tinggi, lukis tangen pada titik itu, dan Vth ialah di mana tangen memotong Id = 0.
Kita guna Vds kecil (50 mV) supaya transistor di kawasan linear, itulah keadaan piawai untuk kaedah ini.

Konvensyen SPICE: arus mengalir *masuk* terminal + sumber voltan. Arus drain NMOS yang dipacu `vd` muncul sebagai **-i(vd)**.
Tambah `-i(vd)` dalam kotak isyarat terbitan untuk lihat Id positif.

## Tugasan
1. Jalankan litar dan tambah `-i(vd)`. Di mana arus mula naik mendadak?
2. Semakan pertama melaporkan Vth yang diukur. Nilai SKY130 nfet 1.8V dengan L = 0.15 µm sepatutnya sekitar 0.7 V.
3. Besarkan **W** supaya Id pada Vgs = 1.8 V melebihi 150 µA. Arus berkadar dengan W/L.

> Nota: W mesti kombinasi bin yang sah. W = 1, 3, 5 atau 7 sentiasa sah (lihat `docs/engine-notes.md`).
