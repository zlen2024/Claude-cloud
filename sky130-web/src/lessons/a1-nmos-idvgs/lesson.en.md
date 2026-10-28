---
title: NMOS Id vs Vgs and Vth
---
# NMOS: Id vs Vgs

**Goal:** see how drain current depends on Vgs and extract the threshold voltage (Vth).

## Theory
Below Vth the transistor is almost off. Above Vth the current rises with Vgs. **Linear extrapolation** method: find the point of
maximum slope (gm), draw the tangent there, and Vth is where the tangent crosses Id = 0.
We use a small Vds (50 mV) so the transistor is in the linear region, the standard condition for this method.

SPICE convention: current flows *into* the + terminal of a voltage source. The NMOS drain current driven through `vd` shows up as **-i(vd)**.
Add `-i(vd)` in the derived-signal box to see a positive Id.

## Tasks
1. Run the circuit and add `-i(vd)`. Where does the current start to rise sharply?
2. The first check reports the measured Vth. For the SKY130 1.8 V nfet with L = 0.15 µm it should be around 0.7 V.
3. Increase **W** so that Id at Vgs = 1.8 V exceeds 150 µA. Current scales with W/L.

> Note: W must be a valid bin. W = 1, 3, 5 or 7 is always valid (see `docs/engine-notes.md`).
