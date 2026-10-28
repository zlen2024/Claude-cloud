---
title: Op-amp in unity feedback: step response
---
# Unity feedback and step response

**Goal:** see how phase margin shows up as overshoot in the time domain.

## Theory
In a voltage-follower configuration (output tied to the inverting input) the closed-loop gain ≈ 1 and the step response depends on phase margin:
- PM ≈ 90°: exponential response with no overshoot.
- PM ≈ 60°: about 10% overshoot (about 5% in two-pole theory).
- Low PM: the loop rings and the overshoot is large.

A small Cc gives a low PM (see the previous lesson), so the response rings. A large Cc slows it down but stabilises it.
The steady-state error ≈ ΔV / (1 + A0). A small step (100 mV) keeps the op-amp from being slew-limited.

## Tasks
1. Run with Cc = 0.1 pF and observe the large overshoot (about 60%).
2. Raise Cc so the overshoot is below 10%, with the final value within 10 mV of 1.0 V and settling to 1 mV in <100 ns after the step.
