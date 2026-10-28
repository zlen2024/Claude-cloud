---
title: Common-source dengan beban sumber arus
module: C
order: 2
---
# Common-source dengan beban sumber arus

**Objektif:** dapatkan gandaan tinggi dengan beban aktif, dan fahami kenapa bias menjadi sukar.

## Teori ringkas
Mengganti perintang dengan PMOS yang dibias sebagai sumber arus memberi beban dengan rintangan kecil secara DC tetapi ro tinggi secara AC.
Gandaan A0 = -gm1 · (ro1 ∥ ro2), jauh lebih tinggi (30 hingga 40 dB berbanding 15 hingga 20 dB dengan perintang).

Tetapi ro1 ∥ ro2 yang tinggi bermakna Vout sangat sensitif kepada Vin DC: beberapa milivolt pada gate menolak Vout dari rel ke rel.
Penguat mesti dibias supaya kedua-dua transistor dalam saturation, dengan Vout berhampiran 0.9 V.
Dalam litar sebenar ini dilakukan dengan maklum balas, di sini kita cari Vin DC secara manual.

Kapasitans keluaran bergabung dengan rintangan keluaran yang tinggi memberi kutub dominan pada frekuensi rendah.

## Tugasan
1. Jalankan litar. Vin = 0.70 V mengalirkan arus terlalu banyak dan menolak Vout ke 0 V (NMOS dalam triode), jadi gandaan sangat rendah.
2. Cari Vin DC yang meletakkan Vout ≈ 0.9 V. Petua: tukar `.ac` kepada `.dc vin 0.5 1.0 0.0005`, lihat `v(out)`,
   kemudian pulihkan `.ac dec 20 1 10G` dengan Vin yang dijumpai.
3. Sasaran: A0 lebih 35 dB, f-3dB kurang 3 MHz dan frekuensi gandaan unit lebih 10 MHz.
