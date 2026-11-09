# Status log

Newest first. Each entry gives the date, the prompt, its commits, what was verified (with numbers), open items and owner questions.

## 2026-10-21: S0 (part) and the rails: tokens, pills, stage card, top and bottom rails

- **Owner direction mid-prompt:** "begin with updating the top and bottom rail. Place the Create, Mix, Score selector centered on the bottom rail. Match the design of the rail components closely. Match the tool tips and selection menus where relevant." That pulled S1's top bar forward.
- **What changed:**
  - **Tokens** (added only; no values the guards pin were changed): pill, pill-text, pill-on, column, edge, menu, menu-hover, float; SIZE.pill 36; radii xs/card/xl/2xl; shadows menu/column/float; TYPE item (14/400).
  - **Primitives:** Pill, IconPill, PillGroup, PILL_ZONE, FloatingCard, Keycap; Button and IconButton `pill` variants, IconButton `bare`; Chip `fill="tint"` + ColorChip; every coloured chip carries data-meaning. Gallery section added.
  - **Frame:** the view and its dock share one stage card (8 px side gutters, radius 12, none above or below, so the body and the Chromebook rows are unchanged); the Inspector is a rounded card; the side rail floats on the page.
  - **Top bar** (44 px, pills): project pill (Back, Project, name, save chip) and Undo/Redo pill at the left; the transport pill (Click, Go to start, Rewind, Record, Play, Fast-forward, Loop) and the position pill centred; the song pill (Key, Tempo, Tap, Metre), Share/⋯ pill, white Export pill and avatar at the right. Play and Record are white icons; Record fills red while recording. Fold step 'tabs-tight' became 'key-short'.
  - **Bottom rail:** Master pill + hint line at the left; Create / Mix / Score centred as pill segments (open view on white/20); a Learn pill at the right that switches the hover hints (white while on).
  - **Overlays:** menus and selects on a borderless #252529 card, radius 10, 40 px rows, 14 px text, quiet shortcuts, scrolling when taller than the window; popovers on #1c1c1f, radius 16; tooltips a dark card with an outlined uppercase keycap. Overlays stay opaque (no blur, unlike the reference).
  - **Also fixed:** the inherited designGuard failure (two 10 px piano-roll buttons now 12 px).
- **Not copied, on purpose:** 8 and 10 px text and weight 500 (owner decision 2 floors; Glacial has 400/700 only); monospace numerals (Glacial everywhere); blurred tooltips; 52 px bars (would cost a Chromebook track row).
- **Verified:**
  - vitest src/daw + src/styles: 5664 pass; 4 fail, all inherited (migrations dynamics.json fails on HEAD; contentBoots/intents/openSession pass alone).
  - eslint src/daw/ui src/daw/shell clean; prettier clean; tsc -b clean.
  - Chrome on 5263 at 1366 wide: the top bar fits unfolded (zones 491/384/446 px); tooltips open below the top bar; Project menu scrolls within the window; Key popover opens downward.
- **Open:**
  - Harness R29/R36 still expect the transport and song in the bottom rail and the view tabs in the top bar (r29 transport-centred, zone checks): update the scenarios before the next browser tier run.
  - 1477 px side-by-side against [s01] not taken (this Chrome is zoomed; owner to reset zoom or confirm).
  - Not pushed.

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
