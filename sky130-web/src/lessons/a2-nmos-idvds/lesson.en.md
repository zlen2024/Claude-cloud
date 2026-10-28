---
title: Id vs Vds family (triode and saturation)
---
# NMOS: Id vs Vds family

**Goal:** identify the **triode** and **saturation** regions and see the effect of channel length.

## Theory
- **Triode** (small Vds): Id rises almost linearly with Vds. The transistor acts like a resistor.
- **Saturation** (Vds > Vgs - Vth): Id is nearly flat. This is the region used for amplifiers.
- In saturation Id still rises slowly with Vds (channel-length modulation). That slope is 1/ro.

Nested sweep: `.dc vd ... vg ...` sweeps Vds for each Vgs value. Each curve is one Vgs and is labelled on the plot.

## Tasks
1. Run and add `-i(vd)`. Find the knee of each curve (where it starts to flatten).
2. For the Vgs = 1.8 V curve, the ratio Id(Vds=1.8)/Id(Vds=1.0) must be below 1.07, i.e. flatter.
   Hint: a longer L reduces channel-length modulation.
