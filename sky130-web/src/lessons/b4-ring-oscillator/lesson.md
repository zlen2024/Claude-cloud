---
title: Ring oscillator
module: B
order: 4
---
# Ring oscillator

**Objektif:** bina osilator daripada inverter dan fahami kaitan frekuensi dengan bilangan peringkat.

## Teori ringkas
Ring oscillator ialah N inverter (N **ganjil**) dalam gelung. Isyarat mengelilingi gelung dalam 2N kelewatan,
jadi tempoh T ≈ 2 · N · tpd dan frekuensi f ≈ 1 / (2 N tpd). Lebih banyak peringkat = frekuensi lebih rendah.
Dengan N genap, litar terkunci dalam keadaan stabil (tiada ayunan).

Simulation bermula daripada keadaan seimbang, jadi `.ic` dan `uic` memberi nod awal yang tidak simetri.
Setiap nod ada 5 fF kapasitans tambahan untuk mewakili pendawaian.

## Tugasan
1. Jalankan litar 3 peringkat dan lihat `v(n1)`. Anggar frekuensi dengan kursor.
2. Tukar kepada **5 peringkat** (tambah `xn4 xp4 cp4 xn5 xp5 cp5`, sambung `n4 -> n5 -> n1`) dan tukar `.ic` jika perlu.
   Frekuensi mesti antara 2 GHz dan 3.5 GHz dengan ayunan penuh.
