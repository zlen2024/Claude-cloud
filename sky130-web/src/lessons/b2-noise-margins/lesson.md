---
title: Margin hingar inverter
module: B
order: 2
---
# Margin hingar

**Objektif:** tentukan VIL, VIH, NML dan NMH daripada VTC dan seimbangkannya.

## Teori ringkas
Titik **VIL** dan **VIH** ialah dua titik pada VTC di mana kecerunan (gandaan) = -1.
- NML = VIL - VOL (margin hingar rendah), dengan VOL ialah Vout ketika Vin = VIH.
- NMH = VOH - VIH (margin hingar tinggi), dengan VOH ialah Vout ketika Vin = VIL.

Inverter yang seimbang mempunyai NML ≈ NMH. Seperti VM, ini bergantung pada nisbah kekuatan PMOS dan NMOS.

## Tugasan
1. Jalankan dan tambah `deriv(v(out))`. Cari dua titik di mana ia bersamaan -1.
2. Selepas semakan pertama, tengok NML dan NMH yang dilaporkan.
3. Ubah W PMOS supaya |NMH - NML| < 0.1 V.
