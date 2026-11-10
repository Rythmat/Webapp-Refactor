# Progressions × Bands: one editor for chords, rhythm and style

Status: **design for owner review**. Nothing here is built yet.
Asked 2026-11-10: "How can Tesseract and Bands combine into one chord progression rhythm and style editor?"

## Why

Prism builds every part from two console libraries that never meet:

- **Progressions** (Tesseract, `/console/cortex/tesseract`). Each one holds degree chords plus style, mood and complexity tags. It has **no rhythm**: Prism lays one chord per bar, or since `3d4ce337` an eight-bar phrase built from fixed templates (`pickProgression.ts` `phraseOf`, `HARMONIC_RHYTHM`).
- **Bands** (`/console/bands`). Each style (variation) holds captured drum, bass and keys parts, recorded over their **own** chords (Latin `Em Am B7 Em`, hip-hop `Cm G`). Prism replays them over its progression through `followChords.ts`. A band never names a progression, and a progression never names a band.

So nobody can hear, in the console, what Prism will actually play for a given progression and band. Nobody can say "this progression holds its IV for two bars", or "this one belongs to the boom-bap style, not trap".

Also, **Prism reads the bundled progression file**, not the console's working copy that Tesseract shows. Edits made in Tesseract never reach Prism.

## The idea: Tesseract stays the map; a progression's drawer learns to play

Opening a progression in Tesseract (its `GraphRowDrawer` + `ProgressionFields`) gains a **Play it** tab:

```
┌ Play it ─────────────────────────────────────────────────────────┐
│ Band  [Pop Band 1 ▾]   Style [The Craft ▾]   Key [C ▾]  ▶  ⟳     │
│                                                                  │
│ Harmonic rhythm (8 bars)                                         │
│ | C        | G        | Am       | F        |                    │
│ | C        | G        | F    G   | C        |   ← drag edges     │
│                                                                  │
│ Drums  ▮▯▮▯▮▯▮▯ …     (LaneStrip, as the Band editor draws it)   │
│ Bass   ━ ━━ ━ ━━ …                                               │
│ Keys   ▬▬  ▬▬  ▬▬ …                                              │
│                                                                  │
│ [Save rhythm]  [This style plays it well ✓]                      │
└──────────────────────────────────────────────────────────────────┘
```

- **Band + style picker.** It lists the same styles Prism can use (`bandStyles()` in `bandPracticeTrack.ts`).
- **Harmonic-rhythm strip.** The progression's chord chips (`ChordChipEditor`) sit on an 8- or 16-bar grid. Dragging a chip's edge stretches it over bars or half bars; a chip can be duplicated into the second half to write an answer phrase.
- **The band's lanes.** `LaneStrip` + `useBandPlayer` (from `src/features/admin/band/`) play the chosen style over that rhythm. They play it **through Prism's own pipeline**: `buildGenrePracticeTrack({ timedChords, followChords, studio })` + `voicePromptChords`. What the editor plays is what Prism writes.
- **Save** writes two new fields on the progression (below). "This style plays it well" ties the progression to the style.

The Band editor gets the mirror image: a variation's preview chart becomes a picker over Tesseract's progressions (by id) instead of free text. That way both editors share one vocabulary, and a band can be auditioned over the progressions tagged for it.

## Data

New optional fields on the `chord_progression` content kind (`ChordProgressionEntry`):

| Field        | Shape        | Meaning                                                                                                                                                       |
| ------------ | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `rhythms`    | `number[][]` | One or more harmonic-rhythm templates, in beats per chord, summing to 32 (8 bars) or 64. Example: `[[4,4,4,4,4,4,2,2,4]]` for a loop written out over 8 bars. |
| `bandStyles` | `string[]`   | Band variations that play it well (`pop-band-1/l2-craft`).                                                                                                    |

How Prism reads them:

- `phraseOf` uses a progression's own `rhythms` (seeded pick) before the default templates.
- When a prompt's style and a progression's `bandStyles` both match, `recipeFor` and `pickProgression` weight that pair up, so a tagged pair plays together more often.
- Both fields are optional. Untagged progressions behave exactly as they do today.

## Prism reads what the console edits

Today `buildPromptPart` and `buildPromptSong` call `loadChordProgressions()`, which reads the static file. To change that:

- Add a non-React loader for the console's working snapshot. It is the same data `useWorkingGraph` → `readProgressionRows` gives Tesseract: API items laid over the repo file, archived items left out.
- Prism loads it lazily, with the static file as the offline fallback.
- This rides on the backend cutover (`docs/console-backend-integration.md`); until the API is truth, the snapshot is the repo file and nothing changes.

## Build order (each a reviewable step)

1. **Loader:** Prism reads the working snapshot (fallback: the static file). No UI.
2. **Fields:** add `rhythms` and `bandStyles` to the kind, its validation (`progressionValidation.ts`) and `ProgressionFields`; teach Prism to read them.
3. **Play it, read-only:** the band and style picker plus lanes, playing the progression with today's default phrase. This step proves "what you hear is what Prism writes".
4. **Rhythm strip:** editing and saving `rhythms`.
5. **Band editor:** preview chart picks from Tesseract; "plays it well" saved from either side.

## Open questions for the owner

1. Should rhythm templates be **per progression** (above) or **per style**? For example, "trap holds each chord two bars", whatever the progression. Per style is less data entry; per progression is more musical.
2. Should a progression's rhythm also allow chord **anticipations** (a push an eighth early)? Or does the band's own feel handle pushes, as it does today?
3. Who edits: only admins, or teachers too, for their own classes?
