# S12: Music Atlas surfaces in the new frame

**Goal:** the surfaces Suno doesn't have work naturally in the new frame: Prism, the chord and sections lanes, Insight, Score/Lead sheet, Practice and Mix.

**Read first:**

- `../spec.md` "Music Atlas surfaces in the frame";
- `components/Prism/`, `prism-engine/`;
- `shell/canvas/ChordLaneHeader.tsx`, `ChordAnalysisBanner.tsx`, `sections/`;
- `components/Score/`, `components/LeadSheet/`, `components/Practice/`;
- `components/Library/` (Insight).

## Build

1. **Prism:**
   - A prompt-bar mode ("Theory") and a "Suggest chords" clip action.
   - Results arrive as **takes** (S8); the old modal is retired.
   - Prism stays Premium; free students see the theory suggestions without Prism's generator.
2. **Chord lane and sections lane:** ruler lanes above the tracks, toggled from a ruler control, in the new tokens. Harmony colours stay the only colour that carries musical meaning.
3. **Insight:** a "This song" Library tile showing the key, chords, form and "what's happening here" for the playhead's bar.
4. **Score / Lead sheet:** full-height views that replace the stage but keep the same top bar. Entered from the view pill.
5. **Practice and Mix** are restyled in the new tokens.
6. **Piano-roll Key and Scale** come from `harmony/effectiveKey.ts`, with scale highlighting on the keys. This is where we beat Suno's unlinked Key [s10].

## Verify

- vitest: Prism suites, chord lane, sections, Score.
- Harness lessons (anchors → S14).
- Chrome: Prism suggestion to take to commit; chord lane; Score round trip.
