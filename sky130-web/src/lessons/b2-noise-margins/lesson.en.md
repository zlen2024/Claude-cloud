---
title: Inverter noise margins
---
# Noise margins

**Goal:** determine VIL, VIH, NML and NMH from the VTC and balance them.

## Theory
**VIL** and **VIH** are the two points on the VTC where the slope (gain) = -1.
- NML = VIL - VOL (low noise margin), where VOL is Vout when Vin = VIH.
- NMH = VOH - VIH (high noise margin), where VOH is Vout when Vin = VIL.

A balanced inverter has NML ≈ NMH. Like VM, this depends on the strength ratio of PMOS and NMOS.

## Tasks
1. Run and add `deriv(v(out))`. Find the two points where it equals -1.
2. After the first check, look at the reported NML and NMH.
3. Change the PMOS W so |NMH - NML| < 0.1 V.
