---
title: Keluarga Id lawan Vds (triode dan saturation)
module: A
order: 2
---
# NMOS: keluarga Id lawan Vds

**Objektif:** kenal pasti kawasan **triode** dan **saturation**, dan lihat kesan panjang saluran.

## Teori ringkas
- **Triode** (Vds kecil): Id naik hampir linear dengan Vds. Transistor bertindak seperti perintang.
- **Saturation** (Vds > Vgs - Vth): Id hampir mendatar. Ini kawasan yang digunakan untuk penguat.
- Dalam saturation Id masih naik perlahan dengan Vds (modulasi panjang saluran). Kecerunan itu ialah 1/ro.

Sapuan bersarang: `.dc vd ... vg ...` menyapu Vds untuk setiap nilai Vgs. Setiap lengkung ialah satu Vgs dan dilabel pada plot.

## Tugasan
1. Jalankan dan tambah `-i(vd)`. Cari lutut setiap lengkung (di mana ia mula mendatar).
2. Untuk lengkung Vgs = 1.8 V, nisbah Id(Vds=1.8)/Id(Vds=1.0) mesti kurang daripada 1.07, iaitu lebih mendatar.
   Petua: L yang lebih panjang mengurangkan modulasi panjang saluran.
