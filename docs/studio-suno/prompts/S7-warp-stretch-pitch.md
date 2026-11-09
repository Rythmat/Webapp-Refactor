# S7: Warp, time-stretch and pitch

**Goal:** audio follows tempo and key changes. This closes old finding F7, "audio doesn't follow tempo changes", and SD8, "audio doesn't move on a key change". The tempo popover's **Follow audio** option comes alive [s37]. Stems inserted with "Match project tempo" line up [s29].

**Read first:**

- `../under-the-hood.md` §2 (worklet + WASM is the proven pattern);
- `engine/playbackScheduler.ts` (it has no `playbackRate` today);
- `audio/AudioClipScheduler.ts`, `audio/graph/workletRegistry.ts`;
- `src/unison/engine/bpmEstimator.ts`.

## Build

1. **Stretcher:**
   - Pick an **MIT- or Apache-licensed** time-stretch/pitch-shift DSP, e.g. Signalsmith Stretch (MIT) built to WASM, or a phase-vocoder worklet.
   - It runs in an AudioWorklet registered through `workletRegistry`.
   - Record the licence in `THIRD_PARTY_NOTICES`.
2. **Clip model:** add `{sourceBpm?, warp: 'off'|'tempo', semitones}`. When tempo changes, clips with warp on stretch by `projectBpm/sourceBpm`. Schema bump.
3. **Scheduler:** schedule stretched clips at audio-clock times. Offline render (`renderProject.ts`) uses the same stretcher, so exports match playback.
4. **BPM detection on import:** `bpmEstimator` runs in the analysis worker. The result is offered as "Follow audio", which sets the project tempo from the clip.
5. **Key change moves audio:** semitone shift when the student changes key, as in old plan 4.6.

## Verify

- vitest: stretch-ratio math, schema migration, scheduler placement at 44.1 and 48 kHz.
- Golden renders: add warp cases.
- Chrome: change 120 → 100 BPM on a drum loop and confirm it stays on the grid; transpose −2 and confirm pitch and timing hold.
