---
title: Op-amp dua peringkat dengan pampasan Miller
module: E
order: 3
---
# Op-amp dua peringkat dan margin fasa

**Objektif:** capai gandaan tinggi dengan dua peringkat dan stabilkan dengan kapasitor Miller.

## Teori ringkas
Dua peringkat (pasangan pembeza + common-source) memberi gandaan dalam julat 60 hingga 80 dB, tetapi ada dua kutub
berhampiran dan margin fasa teruk. **Pampasan Miller**: kapasitor Cc antara keluaran peringkat 1 dan keluaran peringkat 2
membelah kutub: kutub dominan turun jauh (≈ 1/(gm6 · Rout1 · Rout2 · Cc)) dan kutub kedua naik (≈ gm6/Cl).
Cc lebih besar memberi margin fasa lebih baik tetapi fu lebih rendah (fu ≈ gm1/(2π Cc)).

Untuk mengukur gelung terbuka dengan DC yang betul, litar ini menutup gelung maklum balas unit pada DC dengan induktor 1 GH
(litar pintas DC, litar terbuka AC) dan membumikan input songsang pada AC dengan kapasitor 1 GF.
Margin fasa dibaca daripada garis maklumat (diukur relatif kepada fasa DC 0° kerana laluan inp → out tak songsang).

`ib2` dan `iss` ialah sumber arus SPICE ideal.

## Tugasan
1. Jalankan dengan Cc = 1 pF dan baca margin fasa (kira-kira 42°, kurang stabil).
2. Naikkan Cc supaya margin fasa melebihi 55° dengan A0 kekal lebih 60 dB dan fu lebih 5 MHz.
