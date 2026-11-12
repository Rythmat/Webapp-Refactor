# Progressions × Bands: one editor for chords, rhythm and style

Status: **decided 2026-11-10, being built in steps.**
Asked 2026-11-10: "How can Tesseract and Bands combine into one chord progression rhythm and style editor?"

## Owner decisions (2026-11-10)

1. **Chord rhythm belongs to the band style**, not to each progression. "Trap holds each chord two bars" is said once, on the style, and holds for any progression it plays.
2. **A rhythm can push a chord early.** The style says how early its changes arrive, so the band and the chord lane change together on the push.
3. **Admins only.** It is edited in the console, which only admins open.

## Why

Prism builds every part from two console libraries that never met:

- **Progressions** (Tesseract, `/console/cortex/tesseract`): degree chords plus style, mood and complexity tags. They carry no rhythm.
- **Bands** (`/console/bands`): each style (variation) holds captured drum, bass and keys parts, recorded over their own chords. Prism replays them over its progression through `followChords.ts`.

Until now, how long each chord lasts came from fixed templates in Prism (`pickProgression.ts` `phraseOf`). That meant trap and boom bap changed chords the same way. Also, nobody could hear in the console what Prism would play for a given progression and style.

## The model: a style's harmony

A new optional field on a band variation (`BandVariation.harmony`, in `src/curriculum/engine/band/band.ts`):

| Field          | Shape                      | Meaning                                                                                                                                                              |
| -------------- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `barsPerChord` | `0.5 \| 1 \| 2 \| 4`       | How long each chord holds. Trap: 2. A busy jazz comp: 0.5. Default 1.                                                                                                |
| `rhythms`      | `Record<string, number[]>` | Beats each chord holds, by how many chords the loop has. `{"4": [8, 8, 4, 12]}` holds a 4-chord loop as 2, 2, 1 and 3 bars. Overrides `barsPerChord` for that count. |
| `push`         | ticks, `0 \| 120 \| 240`   | How early each change arrives: a 16th or an 8th before the beat.                                                                                                     |

One pure function lays any progression in a style's harmony: `layHarmony(chords, harmony, bars)` → timed chord changes. Three places use it:

- **Prism** (`phraseOf`): the prompt's band style lays the chords. A style with no `harmony` keeps today's eight-bar phrase.
- **The Band editor's preview:** the chart plays in the open style's harmony, so the admin hears what Prism will write.
- **Tesseract's "Play it"** (step 3): any progression in any style.

The band file is written by the Band editor, as every band edit already is.

## Build order (each a reviewable step)

1. **Engine + Prism:** `harmony` on the variation, `layHarmony` with pushes, Prism lays its phrase with it. No UI; nothing changes until a style has `harmony`.
2. **Band editor:** a "Chord rhythm" panel on each style (bars per chord, push, per-length rhythm strip); the preview plays the chart in it.
3. **Tesseract "Play it":** a progression's drawer plays it with a picked band and style, using the Band editor's lanes and player. It is read-only, since the rhythm is the style's.
4. **Prism reads the console's working copy** of the progressions, as Tesseract does, with the bundled file as the offline fallback. This rides on the backend cutover (`docs/console-backend-integration.md`).

## What a push means for each part

- **Chord lane and voiced chords:** the change sits at the pushed tick (`timedChords`), so the lane's region starts early and the chords part sounds the new chord there.
- **Captured band parts** follow the chord sounding at each note (`followChords.ts`), so a note struck in the push plays the new chord's tone.
- **Code-made bass** plays the new root on a mid-bar change (`rootOnChange`).
- **Drums** are unchanged.
