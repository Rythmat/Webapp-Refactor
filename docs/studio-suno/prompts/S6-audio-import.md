# S6: Audio import and storage

**Owner gate:** where uploaded and generated audio is stored, and for how long. Answer this before starting.

**Goal:** students can drop or upload WAV, MP3, M4A, FLAC or OGG files onto the timeline or into "My uploads" [s02 Upload, s23]. The files persist in the project and play through the scheduler.

**Read first:**

- `shell/canvas/libraryDrop.ts`;
- `audio/assets/assetStore.ts`, `assetGc.ts`;
- `persistence/projectDocument/*`, `cloudDocument.ts`;
- `components/Controls/SamplerChopsView.tsx` (its existing WAV/MP3 path and length cap).

## Build

1. **Ways in:**
   - drop on the timeline (new audio track at the drop point, or onto a lane);
   - drop on the Library's My uploads;
   - Add track › Upload (U);
   - the + menu.
2. **Decode** in a worker. Cap length and size; the owner sets the numbers. Pre-compute peaks (`peaksWorker`). Show the grid placeholder until peaks are ready.
3. **Asset model:** an asset becomes `{id, kind: 'upload'|'generated'|'recording', storageRef, sha256, seconds, sampleRate, credit?}`.
   - Uploads go to the chosen storage; drafts keep a local IndexedDB copy.
   - This bumps the schema (migration + round-trip test).
   - Collab peers fetch the asset by its storageRef.
4. **Copyright:** a one-line "Only upload audio you made or have the right to use" at upload time. Teachers can turn uploads off per class (with S13).

## Verify

- vitest: the decode worker, the asset model and migration, libraryDrop for audio.
- Round trip: save/reload with an uploaded clip; collab peers both hear it.
- Chrome: drop a WAV and an MP3; check waveform, play, trim and export.
