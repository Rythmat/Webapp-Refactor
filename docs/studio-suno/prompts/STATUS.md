# Status log

Newest first. Each entry gives the date, the prompt, its commits, what was verified (with numbers), open items and owner questions.

## 2026-10-21: Research, spec and pack (no `src/` changes)

- **Retired** the studio-overhaul prompt pack: `7d28a11e` on `aaron`, not pushed. The two Stage A/B perf reports now note where the old plan lives in git (`487930ff`). The old live plan file was moved to the Trash. The overhaul memories were rewritten.
- **Captured Suno Studio** in the owner's signed-in Chrome:
  - 46 screenshots and raw measurements in `~/Desktop/References/suno-studio-2026-10-21/`.
  - REA 6.7.0 evidence (page inspect, bundle analysis, script export) in its `rea/` folder.
  - 74 credits spent (10000 → 9926).
  - Export › Full Song saved "Untitled Project" privately into the owner's Suno library, and the song prompt made two "One More Try" songs.
- **Wrote** `anatomy.md`, `under-the-hood.md`, `spec.md`, `generation.md` and this pack (S0–S15).
- **Not done:**
  - extracting the inline WASM module (refused by the session's safety check, so not pursued);
  - a cross-origin capture of how audio streams in;
  - finding where Get MIDI results land.
- **Owner gates:**
  1. Review the spec and the pack before S0.
  2. Turn remote debugging off in Chrome (`chrome://inspect/#remote-debugging`) if it's still on.
  3. Choose the GPU host and audio storage before S6/S8.
  4. Confirm Foundation-1's revenue condition.
  5. Decide the agent budget and whether the prompt bar is Premium.
