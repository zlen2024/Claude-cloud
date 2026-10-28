---
title: Pasangan pembeza (isyarat besar)
module: E
order: 1
---
# Pasangan pembeza

**Objektif:** baca fungsi pindah pasangan pembeza dan hubungkan gandaan dengan gm dan beban.

## Teori ringkas
Arus ekor Iss dibahagi antara dua cabang mengikut beza input Vid = Vin1 - Vin2.
Pada Vid = 0 setiap cabang bawa Iss/2. Apabila |Vid| cukup besar, seluruh Iss pergi ke satu cabang
dan keluaran pembeza Vo2 - Vo1 tepu pada ± Iss · Rd.
Kecerunan pada Vid = 0 ialah gandaan isyarat kecil: Av = gm · Rd (gm setiap transistor pada Iss/2).

Sumber arus ekor `iss` ialah sumber SPICE ideal. Dalam peranti sebenar ia ialah transistor (lihat OTA seterusnya).

## Tugasan
1. Jalankan dan tambah `v(o2)-v(o1)` sebagai isyarat terbitan. Baca kecerunan pada Vin1 = 0.9 V.
2. Naikkan gandaan pembeza melebihi 3 (kecerunan) dengan menukar Rd. Jangan sampai transistor jatuh ke triode (Vo > 0.9 V sentiasa).
