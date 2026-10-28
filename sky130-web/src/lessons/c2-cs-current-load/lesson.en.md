---
title: Common-source with current-source load
---
# Common-source with current-source load

**Goal:** get high gain with an active load, and understand why biasing becomes hard.

## Theory
Replacing the resistor with a PMOS biased as a current source gives a load with small DC resistance but high AC ro.
The gain is A0 = -gm1 · (ro1 ∥ ro2), much higher (30 to 40 dB versus 15 to 20 dB with a resistor).

But a high ro1 ∥ ro2 means Vout is very sensitive to the DC Vin: a few millivolts at the gate push Vout from rail to rail.
The amplifier must be biased so both transistors are in saturation, with Vout near 0.9 V.
In real circuits this is done with feedback; here we find the DC Vin manually.

The output capacitance combined with the high output resistance gives a dominant pole at low frequency.

## Tasks
1. Run the circuit. Vin = 0.70 V draws too much current and pushes Vout to 0 V (NMOS in triode), so the gain is very low.
2. Find the DC Vin that puts Vout ≈ 0.9 V. Tip: change `.ac` to `.dc vin 0.5 1.0 0.0005`, look at `v(out)`,
   then restore `.ac dec 20 1 10G` with the Vin you found.
3. Targets: A0 above 35 dB, f-3dB below 3 MHz and unity-gain frequency above 10 MHz.
