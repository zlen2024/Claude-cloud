---
title: Cascode current mirror
---
# Cascode current mirror

**Goal:** raise the current mirror's output resistance with a cascode transistor.

## Theory
Adding xm4 above xm2 (the gate of xm4 biased by xm3) raises the output resistance to about gm4 · ro4 · ro2,
a factor of gm · ro (tens to hundreds of times) over the basic mirror's ro.
The price: the minimum output voltage rises from Vov to Vgs + Vov (about 1.1 V here),
so the output range shrinks. Measure ro only in the high-Vo region (1.4 to 1.7 V) where both transistors are in saturation.

Vds matching: in a cascode, Vds of xm2 ≈ Vds of xm1 = Vgs, so Iout is more accurate than in the basic mirror.

## Tasks
1. Run the basic mirror and measure ro between Vo = 1.4 and 1.7 V (slope of -i(vo)). About 730 kΩ.
2. Replace it with a 4-transistor cascode mirror so ro exceeds 5 MΩ
   and Iout at Vo = 1.5 V stays within ±5% of Iref.
