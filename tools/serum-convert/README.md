# serum-convert

Offline converter: Xfer **Serum 2** `.SerumPreset` files → **Oracle synth**
`PresetData` v2 + wavetable pack assets.

Not part of the app bundle. Run with Node ≥ 23 (type-stripping; uses built-in
`node:zlib` zstd, `node:sqlite`, hand-rolled CBOR + RIFF — zero dependencies).

## Licensing

The Serum factory content (presets, wavetables) is **Xfer Records'
copyrighted material**. This tool reads it only from a local library path you
pass via `--library` — **nothing under that path is committed**. Converted
output lands in `public/daw-assets/oracle-packs/serum2/` (the "factory
extension pack"). That directory is the _only_ place derived content lives;
deleting it fully removes the pack from the app (the SERUM section in the
preset picker disappears; saved projects keep their full parameters and fall
back to Oracle's basic waveforms for any missing table). Keep the pack out of
public distribution unless/until licensing permits.

## Usage

```bash
LIB="/path/to/Xfer Records"   # must contain "Serum 2 Presets"

# 1. Convert the whole curation pool (factory wavetable presets, minus
#    engines Oracle lacks) and rank by fidelity → reports/candidates.md
node tools/serum-convert/src/cli.ts scan --library "$LIB"

# 2. Curate: edit pack-list.json to the preset names you want to ship.

# 3. Emit the runtime pack (preset JSONs + downsampled wavetables + manifest)
node tools/serum-convert/src/cli.ts pack --library "$LIB"

# Debug a single file → stdout PresetData, stderr fidelity report
node tools/serum-convert/src/cli.ts convert --library "$LIB" "<file>.SerumPreset"
```

## How it works

`.SerumPreset` = `XferJson` magic + plain-JSON metadata + `[u32 size][u32 ver]`

- **zstd**-compressed **CBOR** (~175 parameter sections). The mapping picks the
  2 loudest wavetable oscillators, the most-modulation-used LFOs/envelope for
  Oracle's smaller slot budget, buckets Serum's 45+ filter models onto 8 biquad
  types, and translates the mod matrix / macros / FX where Oracle has an
  equivalent. Everything dropped or approximated is recorded in a per-preset
  fidelity report (`reports/`) and scored so curation prefers faithful presets.
  See `src/serumDefaults.ts` for the unit-conversion calibration surface.

## Limitations (intentional)

- Sample / Granular / Spectral / Multisample oscillators — Oracle has no
  equivalent; those presets are excluded from the pool.
- Warp modes (FM/PD/Sync/…), reverb, EQ, convolution, splitters — dropped
  (reported); the two biggest audible gaps are warp and reverb.
- Wavetable-position modulation is control-rate in Oracle — dropped.
- The filter cutoff Hz curve and synced-LFO rate scale are calibration
  assumptions (see `serumDefaults.ts` — items marked `CAL`); refine against
  known-value presets if fidelity matters.
