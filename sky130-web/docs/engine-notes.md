# Engine notes (eecircuit-engine / ngspice-wasm)

Perkara yang kami jumpa dengan menjalankan engine. Jangan rediscover.

## API
- `new Simulation()`, `await sim.start()` sekali, kemudian `setNetList()` + `await runSim()` berulang. Satu instance boleh dipakai semula.
- `sim.getError()` -> `string[]` baris error ngspice.
- Keputusan: `{ header, numVariables, variableNames, numPoints, dataType, data: [{name,type,values}] }`. `data[0]` ialah paksi x.
- Dalam worker kami tukar `values` real kepada `Float64Array` dan pindahkan buffer (transferable). Nilai complex kekal `{real, img}[]`.

## Tiga baris wajib SKY130
```spice
.param mc_switch=0
.option scale=1.0u
.include modelcard.skywater
```

## Bin W/L (PENTING)
Model SKY130 ialah model "binned". Kombinasi W/L yang tiada dalam bin gagal dengan
`could not find a valid modelname`. Diuji dalam engine (W/L dalam um):

| Peranti | W yang sah |
| --- | --- |
| nfet_01v8 | L=0.15: 0.42, 0.6, 0.84, 1, 2, 3, 5, 7. L=0.18: 0.42, 1, 3, 5, 7. L=0.25/0.5/1/2/4/8: 0.42 (kecuali L=0.25), 1, 3, 5, 7 |
| pfet_01v8 | L=0.15 dan 0.18: 0.42, 0.84, 1, 2, 3, 5, 7. L=0.25: 1, 3, 5, 7. L=0.5 hingga 8: 0.42, 1, 3, 5, 7 |

Peraturan praktikal: **W = 1, 3, 5 atau 7 sah untuk semua L** (0.15, 0.18, 0.25, 0.5, 1, 2, 4, 8).
`w=2 l=0.5` GAGAL. Lesson mesti guna kombinasi dalam jadual ini. Ujian lesson akan tangkap kalau salah.

## Sapuan bersarang (`.dc a .. b .. c .. d ..`)
Satu array rata. Nilai x (`v(v-sweep)`) reset ke permulaan bagi setiap nilai sapuan luar. Nilai sapuan luar tidak
dipulangkan sebagai isyarat; kami dapatkan semula daripada netlist (`parseDcSweeps` dalam `src/signals.js`).

## Lain-lain
- Isyarat dalaman model mengandungi `#`. Sorok daripada pengguna.
- Arus: i(vsrc) positif masuk terminal + sumber. Arus drain NMOS yang dipacu `vd` ialah `-i(vd)`.
