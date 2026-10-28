---
title: Self-biased current reference
---
# Self-biased current reference (beta-multiplier)

**Goal:** build a current reference that almost ignores supply changes.

## Theory
A reference made of a resistor and a diode (R from VDD) has a current that changes almost 100% per volt of VDD.
The beta-multiplier feeds the current back onto itself: the PMOS mirror (xm3, xm4) forces the currents of xm1 and xm2 to be equal.
xm2 is K times wider than xm1 and has a resistor R at its source, so
Vgs1 - Vgs2 = I · R. The current is I ≈ (2 / (β1 R²)) · (1 - 1/√K)², depending on R and β, **not** on VDD (to first order).
The residual sensitivity comes from channel-length modulation.

With **K = 1** (xm2 as wide as xm1) the factor (1 - 1/√K) = 0 and the only solution is zero current.
This circuit also has a stable zero-current state, which is why `.nodeset` is there (real circuits need a start-up circuit).

The resistor `r1` is an ideal SPICE element, not a SKY130 resistor.

## Tasks
1. Run. With K = 1 the reference current is almost zero.
2. Make xm2 wider (K = 3). Iref at VDD = 1.8 V must be between 2 µA and 6 µA,
   with supply sensitivity (Iref(2.0) - Iref(1.6)) / Iref(1.8) / 0.4 V below 30 %/V.
