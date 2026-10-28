---
title: Two-stage op-amp with Miller compensation
---
# Two-stage op-amp and phase margin

**Goal:** reach high gain with two stages and stabilise with a Miller capacitor.

## Theory
Two stages (differential pair + common-source) give gain in the 60 to 80 dB range, but have two nearby poles
and poor phase margin. **Miller compensation**: a capacitor Cc between the output of stage 1 and the output of stage 2
splits the poles: the dominant pole moves far down (≈ 1/(gm6 · Rout1 · Rout2 · Cc)) and the second pole moves up (≈ gm6/Cl).
A larger Cc gives better phase margin but lower fu (fu ≈ gm1/(2π Cc)).

To measure the open loop with a correct DC point, this circuit closes unity feedback at DC with a 1 GH inductor
(short at DC, open at AC) and grounds the inverting input at AC with a 1 GF capacitor.
The phase margin is read from the info line (measured relative to the DC phase of 0° since the inp → out path is non-inverting).

`ib2` and `iss` are ideal SPICE current sources.

## Tasks
1. Run with Cc = 1 pF and read the phase margin (about 42°, not very stable).
2. Raise Cc so the phase margin exceeds 55° while A0 stays above 60 dB and fu above 5 MHz.
