# S2: Track column, timeline and clips

**Goal:** track headers, lanes, clips, ruler and overview look and behave like [s03, s08, s09, s14, s31].

**Read first:**

- `../anatomy.md` §3–4;
- `../spec.md` "Track column" and "Timeline";
- `shell/tracklist/*`, `components/Timeline/Timeline.tsx`, `clipChrome.ts`;
- `shell/canvas/TimelineScrollbar.tsx`, `TimelineFooter.tsx`;
- `audio/peaks.ts`, `peakLevels.ts`, `workers/peaksWorker.ts`.

## Build

1. **Track header, 86 px.**
   - Background: a dark mix of the track colour, with a 4 px bar on the left.
   - Row 1: number, name (11 px), mute, solo, arm, ▾ menu.
   - Row 2: a **volume pill** (172×26) and a **pan half-dial**.
   - On hover: collapse caret and ⋯.
   - Keep rename, reorder and the keyboard (`useTrackListKeys`).
2. **Track colours:** each type gets a default (instrument = yellow-family, audio = purple-family), and stems get distinct colours.
   - Colours come from the token palette, and they must keep the meaning colours free (harmony colours stay for chords).
   - Propose the palette to the owner.
3. **Master as a "Main" row** pinned at the foot of the column, moved from `bottombar/MasterRow.tsx`.
4. **"+ Add new track"** under the last track. Its menu offers Audio, Instrument and Upload (Upload is disabled until S6), with single-key shortcuts while the menu is open.
5. **Clip painter** in `Timeline.tsx`:
   - The body is solid track colour.
   - Notes and waveform are drawn inside in a darker shade of that colour.
   - The name sits top-left at 10 px.
   - Selected clips get white trim bars.
   - While peaks load, show a grid placeholder.
6. **Ruler:** the loop range is painted as a wash across all lanes, with square handles on the ruler. The playhead is a triangle plus a line.
7. **Overview strip:** `TimelineScrollbar` becomes a 22 px minimap with time labels and a draggable viewport window.
8. **Performance:** the Timeline stays one canvas. Hold the existing performance budgets (frame-rate state from 1.7/1.8).

## Verify

- vitest: tracklist suites, Timeline painter tests (new snapshot tests for clip geometry), peaks.
- Harness: the round trips and lessons that touch the track list. Expect tutorial-anchor failures; list them for S14 rather than fixing them here.
- Chrome: compare with [s08], [s16], [s31]; check 13 stem-like tracks still scroll smoothly. At Chromebook size, at least 3 rows show with one panel open.
