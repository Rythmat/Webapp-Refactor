# Calibrating the Serum → Oracle converter

Three unit curves can't be derived from the preset data alone — they need
reference presets whose **displayed** values you know. Save ~14 tiny presets
from Serum 2, run one command, and the exact curves are locked into
`calibration.json` (read automatically by every future conversion).

Confirmed-from-data (no calibration needed): filter freq is 0..1 normalized,
resonance 0..100, pan ±50, osc level/detune 0..1, envelopes in seconds,
sustain default 1.0. **Only** the three below are assumptions today.

## How to make each reference preset

In Serum 2, start each from **INIT**, change _only_ the one control named,
then **Save As** with the exact filename shown into one folder (anywhere —
you'll point `--refdir` at it). Filenames drive the fit, so match them
exactly (lowercase, `m` prefix = minus).

### 1. Filter cutoff → Hz (7 presets — the most important)

Turn **Filter 1 ON**, type **LP12**, set the cutoff to each displayed Hz
(right-click the cutoff knob → type the value), save:

| Set cutoff display to | Save as                    |
| --------------------- | -------------------------- |
| 100 Hz                | `cutoff-100.SerumPreset`   |
| 250 Hz                | `cutoff-250.SerumPreset`   |
| 500 Hz                | `cutoff-500.SerumPreset`   |
| 1000 Hz               | `cutoff-1000.SerumPreset`  |
| 2000 Hz               | `cutoff-2000.SerumPreset`  |
| 5000 Hz               | `cutoff-5000.SerumPreset`  |
| 15000 Hz              | `cutoff-15000.SerumPreset` |

(3 would fit the curve; 7 lets the tool report residuals so you can trust it.)

### 2. Master volume → dB (3 presets)

Set the **main output** volume to each dB, save:

| Master display | Save as                    |
| -------------- | -------------------------- |
| 0.0 dB         | `master-0db.SerumPreset`   |
| −6.0 dB        | `master-m6db.SerumPreset`  |
| −12.0 dB       | `master-m12db.SerumPreset` |

### 3. LFO synced rate (4 presets)

Set **LFO 1** to **BPM-sync** (not Free), rate = each division, save:

| LFO1 rate | Save as                    |
| --------- | -------------------------- |
| 1/1       | `lfo-sync-1_1.SerumPreset` |
| 1/2       | `lfo-sync-1_2.SerumPreset` |
| 1/4       | `lfo-sync-1_4.SerumPreset` |
| 1/8       | `lfo-sync-1_8.SerumPreset` |

_(Optional sanity check — confirms free rate really is Hz:)_
Set LFO 1 to **Free** at 2 Hz → `lfo-free-2hz.SerumPreset`.

## Run it

```bash
node tools/serum-convert/src/cli.ts calibrate --refdir "/path/to/your/refs"
# → writes tools/serum-convert/calibration.json + prints the fitted curves
#   and per-point residuals (e.g. "1000→1003" means the fit predicts 1003 Hz
#   for your 1000 Hz reference — tight).
```

Then re-emit the pack so presets pick up the calibrated curves:

```bash
node tools/serum-convert/src/cli.ts pack --library "/path/to/Xfer Records"
```

Partial is fine — provide only the cutoff presets and just that curve gets
calibrated; the others keep their documented defaults.
