---
title: Rujukan arus swa-bias
module: D
order: 3
---
# Rujukan arus swa-bias (beta-multiplier)

**Objektif:** bina rujukan arus yang hampir tidak peduli perubahan bekalan.

## Teori ringkas
Rujukan dengan perintang dan diod (R dari VDD) mempunyai arus yang berubah hampir 100% bagi setiap volt VDD.
Beta-multiplier menyuap balik arus ke dirinya: cermin PMOS (xm3, xm4) memaksa arus xm1 dan xm2 sama.
xm2 K kali lebih lebar daripada xm1 dan ada perintang R pada source, jadi
Vgs1 - Vgs2 = I · R. Arus: I ≈ (2 / (β1 R²)) · (1 - 1/√K)², bergantung pada R dan β, **bukan** pada VDD (pada pendekatan pertama).
Sensitiviti baki datang daripada modulasi panjang saluran.

Dengan **K = 1** (xm2 sama lebar dengan xm1) faktor (1 - 1/√K) = 0 dan satu-satunya penyelesaian ialah arus sifar.
Litar ini juga mempunyai keadaan arus sifar yang stabil, itulah sebab `.nodeset` ada (litar sebenar perlukan litar permulaan, *start-up*).

Perintang `r1` ialah elemen SPICE ideal, bukan perintang SKY130.

## Tugasan
1. Jalankan. Dengan K = 1 arus rujukan hampir sifar.
2. Jadikan xm2 lebih lebar (K = 3). Iref pada VDD = 1.8 V mesti antara 2 µA dan 6 µA,
   dengan sensitiviti bekalan (Iref(2.0) - Iref(1.6)) / Iref(1.8) / 0.4 V kurang daripada 30 %/V.
