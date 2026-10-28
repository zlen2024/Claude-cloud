---
title: Cermin arus asas
module: D
order: 1
---
# Cermin arus asas

**Objektif:** salin arus rujukan dengan nisbah W/L dan ukur rintangan keluaran.

## Teori ringkas
Transistor diod xm1 menukar arus rujukan kepada Vgs. Transistor xm2 dengan Vgs yang sama mengalirkan
Iout = Iref · (W2/L2) / (W1/L1), selagi xm2 dalam saturation (Vo > Vov).
Dalam praktik Iout sedikit berubah dengan Vo kerana modulasi panjang saluran: **ro** = 1/kecerunan.
Padanan arus pada Vds berbeza juga tersasar (Vds xm1 = Vgs, Vds xm2 = Vo).

Guna L yang lebih panjang untuk padanan dan ro yang lebih baik. Di sini L = 0.5 µm.

## Tugasan
1. Jalankan dan tambah `-i(vo)`. Pada Vo = 0.9 V arus keluaran sama dengan Iref (nisbah 1:1).
2. Ubah W xm2 supaya Iout pada Vo = 0.9 V ialah 3 kali Iref (60 µA), dalam ±10%.
3. Rintangan keluaran (kecerunan antara Vo = 0.8 V dan 1.6 V) mesti melebihi 150 kΩ.
