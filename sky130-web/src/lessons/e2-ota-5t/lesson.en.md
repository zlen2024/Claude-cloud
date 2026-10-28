---
title: 5-transistor OTA
---
# 5-transistor OTA

**Goal:** measure the gain and bandwidth of a single-stage OTA.

## Theory
This OTA is an NMOS differential pair with a PMOS current-mirror load. The mirror converts the differential signal of the two branches into
a single output. The gain is A0 = gm1 · (ro2 ∥ ro4). With a capacitive load Cl, the unity-gain frequency
fu ≈ gm1 / (2π · Cl) and it is single-pole, so the phase margin is close to 90°.

Raising the input W (at fixed Iss) raises gm/Id, so gm, A0 and fu go up.
The tail source `iss` is an ideal SPICE source.

## Tasks
1. Run and read A0, f-3dB, fu and phase margin from the info line.
2. Raise the input W so A0 exceeds 35 dB and fu exceeds 20 MHz.
