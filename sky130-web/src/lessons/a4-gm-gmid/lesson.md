---
title: gm dan gm/Id
module: A
order: 4
---
# gm dan gm/Id

**Objektif:** dapatkan transkonduktans gm daripada simulation dan fahami gm/Id sebagai ukuran kecekapan.

## Teori ringkas
gm = dId/dVgs ialah "gandaan" transistor: berapa banyak arus berubah bagi setiap volt pada gate.
Nisbah **gm/Id** (unit 1/V) menunjukkan berapa banyak gm anda dapat bagi setiap ampere:

- Inversi lemah (Vgs di bawah Vth): gm/Id mencapai maksimum kira-kira 1/(n · UT) ≈ 1/(1.3 × 25.9 mV) ≈ 30 /V.
- Inversi kuat: gm/Id jatuh (kira-kira 2/Vov).

Untuk arus Id yang sama, transistor yang lebih lebar (W/L besar) beroperasi lebih dekat inversi lemah, jadi gm/Id lebih tinggi.
Itulah pertukaran asas rekaan analog: gm/Id tinggi = kecekapan arus tinggi tetapi saiz besar dan lebih perlahan.

## Tugasan
1. Jalankan, kemudian tambah dua isyarat terbitan: `-i(vd)` dan `deriv(-i(vd))` (itu gm).
   Tambah juga `deriv(-i(vd))/(-i(vd))` untuk gm/Id. Cari puncaknya.
2. Pada Id = 10 µA, gm/Id mesti lebih daripada 15 /V. Ubah W (L kekal 0.5 µm).
