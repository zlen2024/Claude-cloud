---
title: Op-amp dalam maklum balas unit: sambutan langkah
module: E
order: 4
---
# Maklum balas unit dan sambutan langkah

**Objektif:** lihat bagaimana margin fasa muncul sebagai lajak (overshoot) dalam domain masa.

## Teori ringkas
Dalam konfigurasi pengikut voltan (keluaran ke input songsang) gandaan gelung tertutup ≈ 1 dan sambutan langkah bergantung pada margin fasa:
- PM ≈ 90°: sambutan eksponen tanpa lajak.
- PM ≈ 60°: lajak kira-kira 10% (kira-kira 5% dalam teori dua kutub).
- PM rendah: gelung berayun dan lajak besar.

Cc kecil memberi PM rendah (lihat pelajaran sebelum ini), jadi sambutan berayun. Cc besar memperlahankan tetapi menstabilkan.
Ralat keadaan mantap ≈ ΔV / (1 + A0). Langkah yang kecil (100 mV) mengelakkan op-amp terhad kadar-pusing (slew).

## Tugasan
1. Jalankan dengan Cc = 0.1 pF dan perhatikan lajak besar (kira-kira 60%).
2. Naikkan Cc supaya lajak kurang daripada 10%, dengan nilai akhir dalam 10 mV daripada 1.0 V dan penetapan (settling) dalam 1 mV pada <100 ns selepas langkah.
