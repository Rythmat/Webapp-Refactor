# ir-convert

Build-time tool that turns source reverb impulse responses into the runtime
assets the Studio's convolution reverb loads at
`public/daw-assets/reverb-irs/` (one 16-bit WAV per reverb type + `manifest.json`).

Zero-dependency, Node-native TypeScript (run the `.ts` directly, like
`tools/serum-convert`). Requires **ffmpeg + ffprobe** on `PATH`
(`brew install ffmpeg`). `.SDIR` (Logic Space Designer) files are AIFF
underneath, so ffmpeg reads them directly.

## Usage

```sh
# List IR candidates under a source folder (to pick sources for pack-list.json)
node tools/ir-convert/src/cli.ts scan --library "/path/to/IR source"

# Convert the curated set → public/daw-assets/reverb-irs/
node tools/ir-convert/src/cli.ts pack --library "/path/to/IR source"
```

`--library` is the only way source paths enter the tool; **nothing under the
library is committed.** Curate by editing `pack-list.json` (one entry per Studio
reverb `type`: `hall room chamber plate spring`).

## Pipeline (per IR)

1. Trim **leading** silence (the app adds its own pre-delay via `reverbPreDelay`;
   a baked-in gap would double it).
2. Trim **trailing** near-silence (caps `ConvolverNode` CPU).
3. Peak-normalize to **-1 dBFS**, force **stereo / 44.1 kHz**.
4. Dither to **16-bit** (`triangular`).
5. Measure RMS + duration → write a per-IR loudness-match **`gain`** to the
   manifest (`gain × rms × √duration ≈ ENERGY_TARGET`), applied at runtime so
   every type sits at the same wet loudness. Calibrate the single `ENERGY_TARGET`
   constant in `src/cli.ts` by ear against the old synthetic reverb.

## ⚠ Licensing — READ BEFORE SHIPPING

`pack-list.json` ships pointing at the **Logic Space Designer reference
collection**, which is **NOT licensed for redistribution**. Those entries (and
any manifest/WAVs generated from them) are **PLACEHOLDERS for local verification
only** — the manifest is stamped `license: "PLACEHOLDER-DO-NOT-SHIP"` and carries
a top-level `_warning`.

Before release: repoint each `source` at a redistributable IR
(e.g. **Samplicity Bricasti M7** — royalty-free, no attribution — for
hall/room/chamber/plate; a **CC0** spring IR from Freesound), update
`license`/`sourceName`/`attribution`, re-run `pack`, and confirm the manifest no
longer contains `PLACEHOLDER`. Deleting the whole `public/daw-assets/reverb-irs/`
folder is safe — the loader 404s silently and the reverb falls back to the
built-in synthetic IRs.
