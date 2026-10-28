---
title: PMOS lawan NMOS dan nisbah mobiliti
module: A
order: 3
---
# PMOS lawan NMOS

**Objektif:** bandingkan arus PMOS dan NMOS yang sama saiz dan faham kenapa PMOS perlu lebih lebar.

## Teori ringkas
Mobiliti lubang (pembawa dalam PMOS) lebih rendah daripada mobiliti elektron (NMOS), kira-kira 2 hingga 3 kali ganda.
Untuk W/L yang sama, PMOS mengalirkan arus yang jauh lebih kecil. Dalam inverter ini bermakna PMOS dibuat lebih lebar
supaya kenaikan dan kejatuhan output seimbang.

Dalam litar ini kedua-dua transistor dipacu dengan |Vgs| yang sama: sumber `egp` menjadikan voltan gate PMOS = VDD - vg,
jadi Vsg PMOS = vg. Arus PMOS ialah `i(vdp)`, arus NMOS ialah `-i(vdn)`.

## Tugasan
1. Jalankan dan tambah `-i(vdn)` dan `i(vdp)`. Berapa nisbah Ip/In pada Vgs = 1.8 V dengan W yang sama?
2. Ubah W PMOS supaya Ip hampir sama dengan In (nisbah antara 0.75 dan 1.25).
