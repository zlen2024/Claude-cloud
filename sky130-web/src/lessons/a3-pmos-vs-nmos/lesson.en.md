---
title: PMOS vs NMOS and the mobility ratio
---
# PMOS vs NMOS

**Goal:** compare the current of equally sized PMOS and NMOS and understand why the PMOS must be wider.

## Theory
Hole mobility (carriers in a PMOS) is lower than electron mobility (NMOS), roughly 2 to 3 times.
For the same W/L the PMOS carries much less current. In an inverter this means the PMOS is made wider
so rise and fall are balanced.

In this circuit both transistors are driven with the same |Vgs|: source `egp` makes the PMOS gate voltage = VDD - vg,
so the PMOS Vsg = vg. The PMOS current is `i(vdp)`, the NMOS current is `-i(vdn)`.

## Tasks
1. Run and add `-i(vdn)` and `i(vdp)`. What is the Ip/In ratio at Vgs = 1.8 V with equal W?
2. Change the PMOS W so that Ip is close to In (ratio between 0.75 and 1.25).
