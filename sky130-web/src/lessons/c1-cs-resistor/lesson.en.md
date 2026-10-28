---
title: Common-source with resistor load
---
# Common-source: gain and bandwidth

**Goal:** read the AC gain and -3 dB frequency, and understand the gain vs bandwidth trade-off.

## Theory
For small signals, A0 = -gm · (Rd ∥ ro). The output pole is f-3dB = 1 / (2π · (Rd ∥ ro) · Cl).
Raising Rd raises the gain but lowers the bandwidth: the gain-bandwidth product is roughly constant.
A 1 V AC signal on `vin` makes `v(out)` equal to the gain directly. The low-frequency phase is 180° (inverting amplifier).

A very large Rd moves the output DC point down (Id · Rd lowers Vout) and the transistor can fall out of saturation.

## Tasks
1. Run and look at the Bode plot for `v(out)`. Read A0 and f-3dB.
2. Raise the gain above 18 dB by changing **Rd**, but keep f-3dB above 20 MHz.
