---
title: CMOS inverter: propagation delay
---
# CMOS inverter: transient and delay

**Goal:** measure propagation delay and reduce it with transistor sizing.

## Theory
The delay **tpd** is the time from Vin crossing VDD/2 to Vout crossing VDD/2. To first order
tpd ~ 0.69 · R · C, where R is the on-resistance of the transistor and C is the load. A wider transistor has smaller R,
so it is faster, but loads the previous stage with more capacitance.

Use the two cursors (A and B) on the plot to read the time difference between Vin and Vout crossing 0.9 V.

## Tasks
1. Run and measure tpd with the cursors. With Wn = 0.42 and Wp = 1 it is about 124 ps.
2. Increase both W so tpd is below 80 ps with Cl fixed at 20 fF.
