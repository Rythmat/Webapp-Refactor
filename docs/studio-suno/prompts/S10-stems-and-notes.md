# S10: Stems and convert to notes

**Goal:**

- **Split into stems** works like Suno's modal [s25–s31].
- **Convert to notes** turns an audio clip into a MIDI track. Unlike Suno's Get MIDI [s32], the result is always visible: a new track, with a toast that jumps to it.

**Read first:**

- `../anatomy.md` §9;
- `src/learn/audio/v2/BasicPitchPeer.ts`, `PolyphonicNoteTracker.ts`;
- `public/daw-assets/basic-pitch-worklet.js`;
- `harmony/*` (for naming the key and chords of the result).

## Build

1. **Stems modal:**
   - Modes: **Auto** (all instruments Demucs finds), **Vocals / everything else**, and **Pick instruments**.
   - Results: a "Match project tempo" toggle (needs S7) and "Insert all"; per-stem rows with play, mute/solo, Insert and download; empty stems hidden.
   - Insert all makes one track per stem with distinct colours, named "‹Song› (‹Stem›)", aligned to the source.
2. **Convert to notes:**
   - Basic Pitch runs **offline** on the clip in a worker. Reuse the model and weights already shipped; no server needed.
   - The result is a new instrument track with a sensible instrument (bass stem → bass), quantised to the grid.
   - The key and chords found go to the chord lane, as a suggestion banner (`ChordAnalysisBanner`).
3. **Find the chords** (clip menu): `OfflineChordAnalyzer` in the analysis worker → chord lane suggestions.

## Verify

- vitest: the convert-to-notes worker on fixture audio (note-accuracy threshold), the stem-insert model.
- Chrome: split a song into stems, Insert all, convert the bass stem to notes, compare with [s29–s31].
