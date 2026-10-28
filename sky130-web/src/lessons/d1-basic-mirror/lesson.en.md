---
title: Basic current mirror
---
# Basic current mirror

**Goal:** copy a reference current with a W/L ratio and measure the output resistance.

## Theory
The diode-connected transistor xm1 converts the reference current into Vgs. Transistor xm2 with the same Vgs carries
Iout = Iref · (W2/L2) / (W1/L1), as long as xm2 is in saturation (Vo > Vov).
In practice Iout changes slightly with Vo because of channel-length modulation: **ro** = 1/slope.
The match also drifts when Vds differs (Vds of xm1 = Vgs, Vds of xm2 = Vo).

Use a longer L for better matching and ro. Here L = 0.5 µm.

## Tasks
1. Run and add `-i(vo)`. At Vo = 0.9 V the output current equals Iref (1:1 ratio).
2. Change the W of xm2 so Iout at Vo = 0.9 V is 3 times Iref (60 µA), within ±10%.
3. The output resistance (slope between Vo = 0.8 V and 1.6 V) must exceed 150 kΩ.
