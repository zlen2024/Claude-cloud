---
title: Differential pair (large signal)
---
# Differential pair

**Goal:** read the transfer function of a differential pair and relate the gain to gm and the load.

## Theory
The tail current Iss is split between the two branches according to the input difference Vid = Vin1 - Vin2.
At Vid = 0 each branch carries Iss/2. When |Vid| is large enough, all of Iss goes to one branch
and the differential output Vo2 - Vo1 saturates at ± Iss · Rd.
The slope at Vid = 0 is the small-signal gain: Av = gm · Rd (gm of each transistor at Iss/2).

The tail current source `iss` is an ideal SPICE source. In a real device it is a transistor (see the next OTA).

## Tasks
1. Run and add `v(o2)-v(o1)` as a derived signal. Read the slope at Vin1 = 0.9 V.
2. Raise the differential gain above 3 (the slope) by changing Rd. Do not let the transistors fall into triode (Vo stays above 0.9 V).
