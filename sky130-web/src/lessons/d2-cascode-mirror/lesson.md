---
title: Cermin arus cascode
module: D
order: 2
---
# Cermin arus cascode

**Objektif:** tingkatkan rintangan keluaran cermin arus dengan transistor cascode.

## Teori ringkas
Menambah xm4 di atas xm2 (gate xm4 dibias oleh xm3) menaikkan rintangan keluaran kepada kira-kira gm4 · ro4 · ro2,
iaitu faktor gm · ro (puluhan hingga ratusan kali) lebih daripada ro cermin asas.
Harganya: voltan minimum keluaran naik daripada Vov kepada Vgs + Vov (kira-kira 1.1 V di sini),
jadi julat keluaran berkurang. Ukur ro hanya di kawasan Vo tinggi (1.4 hingga 1.7 V) di mana kedua-dua transistor dalam saturation.

Pemadanan Vds: dalam cascode, Vds xm2 ≈ Vds xm1 = Vgs, jadi Iout lebih tepat daripada cermin asas.

## Tugasan
1. Jalankan cermin asas dan ukur ro antara Vo = 1.4 dan 1.7 V (kecerunan -i(vo)). Kira-kira 730 kΩ.
2. Gantikan dengan cermin cascode 4 transistor supaya ro lebih daripada 5 MΩ
   dan Iout pada Vo = 1.5 V kekal dalam ±5% Iref.
