---
title: CMOS inverter: VTC and switching point
---
# CMOS inverter: Voltage Transfer Curve

**Goal:** read the inverter VTC and adjust sizing so the switching point VM sits in the middle (VDD/2 = 0.9 V).

## Theory
VM is the Vin at which Vout = Vin. There both NMOS and PMOS are in saturation and their currents are equal.
The PMOS is weaker (lower mobility), so with equal W the VM falls below VDD/2.
Increasing the PMOS W raises VM. Add the derived signal `v(out)-v(in)` and find where it crosses zero.

## Tasks
1. Run and read VM. With NMOS W = PMOS W = 1 µm, VM is about 0.84 V.
2. Change the **PMOS W** so VM is within 0.9 V ± 0.04 V.
