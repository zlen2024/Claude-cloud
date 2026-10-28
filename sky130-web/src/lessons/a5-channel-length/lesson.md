---
title: Modulasi panjang saluran dan ro
module: A
order: 5
---
# Modulasi panjang saluran

**Objektif:** ukur rintangan keluaran ro daripada kecerunan lengkung Id-Vds dan lihat kesan L.

## Teori ringkas
Dalam saturation Id sedikit naik dengan Vds. Kecerunan itu ialah 1/ro dengan ro ≈ 1/(λ · Id).
Parameter λ berkadar songsang dengan L, dan Id berkadar songsang dengan L juga (W/L), jadi **ro berkadar kira-kira dengan L²**.
Ro tinggi menjadikan penguat dan cermin arus lebih baik, itulah sebab litar analog guna L lebih panjang daripada minimum.

Dalam litar ini tiga transistor sama W = 1 µm berkongsi Vgs = 1.0 V dan satu sapuan Vds.
Sumber 0 V `vm1..vm3` mengukur arus setiap satu. Arus Id = `i(vm1)` dsb. (positif).

## Tugasan
1. Jalankan dan tambah `i(vm1)`, `i(vm2)`, `i(vm3)`. Mereka serupa kerana L sama.
2. Ubah L: xm2 kepada 0.5 µm, xm3 kepada 1 µm. ro (kecerunan antara Vds = 1.0 dan 1.6 V) bagi xm3 mesti lebih 5 kali ro xm1.
