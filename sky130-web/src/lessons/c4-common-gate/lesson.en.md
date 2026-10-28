---
title: Common-gate
---
# Common-gate

**Goal:** recognise the common-gate form: input at the source, non-inverting gain, low input resistance.

## Theory
The gate is held at a fixed DC voltage (AC ground). The signal enters at the source and leaves at the drain.
Increasing Vin lowers Vgs, so the current falls and Vout rises: **positive gain** (phase 0°).
The gain is A0 ≈ (gm + gmb) · (Rd ∥ ro). The input resistance ≈ 1/gm is low, suitable for connecting a current source.
The output pole is 1/(2π · Rd · Cl), as in the common-source.

Here Vg = 1.0 V and DC Vin = 0.1 V give Vgs = 0.9 V.

## Tasks
1. Run, confirm the 0° phase and read A0.
2. Raise A0 above 16 dB by changing Rd. Keep the transistor in saturation (Vout must not fall below Vg - Vth ≈ 0.3 V).
   f-3dB must stay above 50 MHz.
