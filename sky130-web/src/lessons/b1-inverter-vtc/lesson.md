---
title: Inverter CMOS: VTC dan titik pensuisan
module: B
order: 1
---
# Inverter CMOS: Voltage Transfer Curve

**Objektif:** baca VTC inverter dan laras saiz supaya titik pensuisan VM berada di tengah (VDD/2 = 0.9 V).

## Teori ringkas
VM ialah Vin di mana Vout = Vin. Di situ NMOS dan PMOS kedua-duanya dalam saturation dan arus mereka sama.
PMOS lebih lemah (mobiliti rendah), jadi dengan W yang sama VM tersasar ke bawah VDD/2.
Menambah W PMOS menaikkan VM. Tambah isyarat terbitan `v(out)-v(in)` dan cari di mana ia melintasi sifar.

## Tugasan
1. Jalankan dan baca VM. Dengan W NMOS = W PMOS = 1 µm VM kira-kira 0.84 V.
2. Ubah **W PMOS** supaya VM berada dalam 0.9 V ± 0.04 V.
