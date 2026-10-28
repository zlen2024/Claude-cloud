---
title: Ring oscillator
---
# Ring oscillator

**Goal:** build an oscillator from inverters and understand how frequency relates to the number of stages.

## Theory
A ring oscillator is N inverters (N **odd**) in a loop. The signal goes around the loop in 2N delays,
so the period T ≈ 2 · N · tpd and the frequency f ≈ 1 / (2 N tpd). More stages = lower frequency.
With even N the circuit locks into a stable state (no oscillation).

The simulation starts from a balanced state, so `.ic` and `uic` give the initial nodes an asymmetry.
Each node has 5 fF of extra capacitance to represent wiring.

## Tasks
1. Run the 3-stage circuit and look at `v(n1)`. Estimate the frequency with the cursors.
2. Change to **5 stages** (add `xn4 xp4 cp4 xn5 xp5 cp5`, connect `n4 -> n5 -> n1`) and adjust `.ic` if needed.
   The frequency must be between 2 GHz and 3.5 GHz with full swing.
