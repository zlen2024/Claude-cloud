---
title: Source follower
---
# Source follower

**Goal:** understand why the source-follower gain is below 1 and how to approach 1.

## Theory
In a source follower the output is taken at the source, so the signal is not inverted and the gain is close to 1 (phase 0°).
Gain ≈ gm · RL' / (1 + (gm + gmb) · RL'), where RL' = RL ∥ ro. It is always below 1 and
grows when gm · RL' is large. The **body effect** (gmb: bulk at 0 while the source rises) reduces the gain further.

The output resistance ≈ 1/gm is low, which is why followers are used as buffers.

## Tasks
1. Run and read the linear gain (10^(dB/20)). With W = 3 and RL = 5k it is about 0.63.
2. Raise the gain above 0.78 by changing W and RL. Keep f-3dB above 100 MHz.
