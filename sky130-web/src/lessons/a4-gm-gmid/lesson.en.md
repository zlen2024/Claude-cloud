---
title: gm and gm/Id
---
# gm and gm/Id

**Goal:** obtain the transconductance gm from simulation and understand gm/Id as an efficiency measure.

## Theory
gm = dId/dVgs is the transistor's "gain": how much the current changes per volt at the gate.
The **gm/Id** ratio (unit 1/V) shows how much gm you get per ampere:

- Weak inversion (Vgs below Vth): gm/Id peaks at about 1/(n · UT) ≈ 1/(1.3 × 25.9 mV) ≈ 30 /V.
- Strong inversion: gm/Id falls (about 2/Vov).

For the same current Id, a wider transistor (larger W/L) operates closer to weak inversion, so gm/Id is higher.
That is the basic trade-off in analog design: high gm/Id = high current efficiency but large size and slower speed.

## Tasks
1. Run, then add two derived signals: `-i(vd)` and `deriv(-i(vd))` (that is gm).
   Also add `deriv(-i(vd))/(-i(vd))` for gm/Id. Find its peak.
2. At Id = 10 µA, gm/Id must exceed 15 /V. Change W (keep L = 0.5 µm).
