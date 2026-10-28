---
title: Channel-length modulation and ro
---
# Channel-length modulation

**Goal:** measure the output resistance ro from the slope of the Id-Vds curve and see the effect of L.

## Theory
In saturation Id rises slightly with Vds. That slope is 1/ro with ro ≈ 1/(λ · Id).
The parameter λ is inversely proportional to L, and Id is inversely proportional to L too (W/L), so **ro scales roughly with L²**.
A high ro makes amplifiers and current mirrors better, which is why analog circuits use L longer than the minimum.

In this circuit three identical W = 1 µm transistors share Vgs = 1.0 V and one Vds sweep.
The 0 V sources `vm1..vm3` measure each current. Id = `i(vm1)` etc. (positive).

## Tasks
1. Run and add `i(vm1)`, `i(vm2)`, `i(vm3)`. They are identical because L is the same.
2. Change L: xm2 to 0.5 µm, xm3 to 1 µm. The ro of xm3 (slope between Vds = 1.0 and 1.6 V) must exceed 5 times the ro of xm1.
