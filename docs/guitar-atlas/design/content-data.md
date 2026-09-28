# Sub-plan: Guitar content, data model and flow builder (The Guitar Atlas: Book One)

## Goals

1. Add a typed, reviewable data module for all 12 Book One key centers:

   - major-scale position and pentatonic position
   - Root Position Triads 1–6
   - Root Position 7th Chords 1–7 plus the octave box
   - Music Maps Examples 1–5, with the book's exact rhythms

   The data is authored from the verified extraction. Every correction to the book is logged and checked by tests.

2. Extend the types additively: fret positions on notes, a flow-level instrument, and chord identity on steps in the vocabulary `AudioChordDetector` reports.
3. Add `buildGuitarAppliedTheoryFlow(keyName)`. It mirrors `buildAppliedTheoryFundamentalsFlow` step for step. The book's extras go in new subsections built with the same builders. Piano's D3 Two-Hand becomes the Music Maps.
4. Keep the piano output byte-identical, enforced by golden snapshots that are committed before any other change.

## Verified facts that drive the design

- `appliedTheoryFundamentals.ts`:
  - Scale steps (1–6) and arpeggio steps (15–22) have no `targetNotes`. They are generated from `keyRoot` by `generateScale` / `generateArpeggio` (`resolveStepContent.ts:94-145`).
  - Every other step has explicit `targetNotes` (Priority 1, `resolveStepContent.ts:193-196`).
  - All notes then pass through `applyRegisterRules` (`resolveStepContent.ts:148-161`). That is the only call site (the container calls the resolver once, at `GenreLessonContainerV2.tsx:331-343`).
- **Piano B3 timing bug:** `chordBlockNotes` (`:399-414`) uses each duration as the spacing too. So B3.1 staccato puts two chords 140 ticks apart (onsets 0 and 140), and B3.3 has onsets 0/140/580/720. That is unplayable on guitar and shorter than the detector's roughly 500 ms vote window.
- Piano IT arpeggio copy says "up and down", but its tag has no `descending`, so the content only goes up.
- Nothing reads `InstrumentConfig.instrument`. Other code reads `hand_config`, `lh_role` and `rh_role`: `registerRules.classifyNote`, `isDualStaff` in the container (`:390-397`), `StepEditor`, `activityPresets`, `handSplit`.
- `stepNumber` is never read by the container. Progress and variant rotation key on `tag` (`:296`, `:981`), so tags must be unique within a flow.
- `parseChord` / `normalizeQuality` accept `Cmaj7`, `Dm7`, `G7`, `Bm7b5`, `E#m7b5`. `chordSymbolTones` / `parseNoteName` handle E#, Gb and Cb.
- `spellScale(root, steps)` (`enharmonicEngine.ts:204`) spells F# major's 7th degree as E♯.
- `AudioChordDetector` emits `{rootPc, quality}` where quality is a `CHORDS` key. `major`, `minor`, `major7`, `minor7`, `dominant7` and `minor7b5` all exist in `src/daw/prism-engine/data/chords.ts`.
- `SCALE_TO_MODE` has no `'major'` entry, so the piano flow's key colour falls back to a dorian shift. This is existing behaviour; guitar mirrors it.
- Extraction checks I ran on `keys.json`:
  - All 8 major-scale dots per key run tonic to tonic on strings 6–4. All 6 pentatonic dots run tonic to tonic on strings 3–1. Every dot is in key.
  - 164 of 168 chord-page shapes pass the pitch-class check with the root lowest. The 4 that fail are the known errata; G's octave box already records the drawn frets.
  - All 156 map bars sum to 4 beats.
  - 7 map bars fail the pitch check, all from the known Db Ex1–3 and Eb Ex3 fret-label errors.
  - The 4 name typos are confirmed.
  - Every fingering covers every fretted note, with span ≤ 4 frets.
  - `diagramStartFret` cannot be derived by a rule (10 of 168 differ), so it must be stored.
  - Box 8 sits an octave above box 1 in 10 keys. In Db it is an exact duplicate; in Eb it is the same root (Eb3) in a different voicing.

## Design decisions

1. **Store sounding MIDI, derived from frets.** Each note's MIDI is `STANDARD_TUNING[string] + fret`, with E2 = 40, A2 = 45, D3 = 50, G3 = 55, B3 = 59, E4 = 64. The fret string is the only stored pitch data, so there is nothing to transcribe wrongly.
   - Why: this is what a microphone hears and what a MIDI guitar sends for the book's shape. A strummed open C (C3 E3 G3 C4 E4) matches exactly. TAB comes straight from `fretPosition`.
   - Rejected: piano-register triads, which would fail against real guitar voicings.
2. **Store instrument at flow level: `ActivityFlowParamsV2.instrument?: LessonInstrument`.** A missing value means piano, so the piano object stays unchanged. Everything reads it through `flowInstrument(flow)`.
   - Rejected: widening `InstrumentConfig` to a guitar union. Its required fields are piano hand roles, and its presence switches on `isDualStaff` and register-role classification. Four readers would need narrowing, and no reader wants it.
3. **Bypass the piano register logic for guitar in the resolver only.**
   - `StepContext.instrument?` is added.
   - `resolveStepContent` returns the raw notes before `applyRegisterRules` when `ctx.instrument === 'guitar'`.
   - `resolveRawStepContent` returns `null` with a warning for guitar steps that lack `targetNotes`, so the piano generators can never produce guitar content.
   - The container passes `instrument: flow.params.instrument`. For piano that is `undefined`, so the code path is identical.
   - Rejected: a guitar branch inside `registerRules`, which would spread instrument knowledge into the rule engine.
4. **Every guitar step has explicit `targetNotes` with `fretPosition`.** `scaleIntervals` is never set on guitar steps; `scaleId` is kept as metadata.
5. **Add chord identity: `ActivityStepV2.chordTargets?: ChordTarget[]`.**
   - Set on every chord-derived step. Arpeggios get one target spanning the arpeggio, with `attack: 'arpeggio'`. Strummed steps get one target per strum, with `attack: 'strum'`.
   - Each target carries `pitchClasses` and `bassPc`, so the evaluator can accept pitch-class equivalents that `AudioChordDetector` may name differently (Am7 has the same pitch classes as C6).
   - Targets use the same untransposed tick timeline as `targetNotes`. The count-in offset is handled by the container, as today.
6. **Data is typed TypeScript, one file per key.** Chord names and symbols are derived from key, degree and quality, never stored, so typos cannot reappear. A slim copy of the extraction JSON is committed as a test fixture only (not bundled). A test diffs the data against it, and every deviation must cite an erratum whose `asPrinted` equals the fixture value.
   - Rejected: building the data at runtime from JSON plus patches (weakly typed, and the barre field is free text).
   - Rejected: hand-typing from the PDF.
7. **Mirror piano by writing separate guitar builders.** The only edit to the piano file is adding `export` to constants that are already there. A parity test proves the mirrored steps match piano in:

   - subsection and activity label
   - assessment
   - tag suffix
   - onsets and durations
   - scale-degree sequence, or pitch-class set per chord

   Rejected: parameterising the piano builders, which risks the byte-identical piano flow.

8. **B3 is the one intentional deviation.** Guitar B3 puts one chord per quarter-note beat and uses piano's note lengths: 120 ticks staccato, 420 legato. This is the same beat-plus-length logic that A3 uses. Piano is left unchanged (see Open questions).
9. **B1 and B5 mirror piano: arpeggios go up only, one note per beat, 460 ticks each.** On guitar that means picking every sounding string of the book shape, lowest to highest. The guitar copy describes what is actually played.
10. **Music Maps repeat once.** Each map is played through twice because every map has repeat signs; chord symbols repeat across both passes via `chordsPerBar`. Note length is the rhythm value minus 20 ticks, the same convention as piano. Rests move the onset forward and produce no note.
11. **Flow parameters:**
    - `tempoRange: [60, 100]`, versus piano's `[80, 100]`. Eighth-note chord changes at 80 BPM last 375 ms, below the detector's vote window. Rejected: copying piano's 80 floor.
    - `defaultScaleId: 'major'` and `defaultKey: \`${key} Major (Ionian)\``, the same as piano.
    - `genre: 'guitar-applied-theory-fundamentals'`, which gives a separate progress key.
    - Tags use the form `guitar_fund:<suffix> | applied_theory_guitar`; module is `applied_theory_guitar_l1`; `styleRef` is `l1a`.
12. **Contours (A2, A3, D1) use the first three notes of the major-scale position.** That is the diagram the student has just played in A1. Rejected: the pentatonic position, which only comes later in A4.
13. **Octave box: Db and Eb become true octaves by default.**

    - Db: `X-16-18-17-18-X`
    - Eb: `X-18-20-19-20-X`

    Both use box 1's fingering shifted up 12 frets and both are logged. See Open questions.

## Exact file changes

### New files

**`src/lib/guitar/fretboard.ts`** (shared by data, TAB and evaluator)

- `export type GuitarStringNumber = 1|2|3|4|5|6` (6 = low E)
- `export interface FretPosition { string: GuitarStringNumber; fret: number }`
- `export const GUITAR_STANDARD_TUNING: Readonly<Record<GuitarStringNumber, number>>`
- `fretToMidi(p: FretPosition): number`
- `parseShape(frets: string): readonly (number|null)[]` — parses `'X-3-2-0-1-0'`; index 0 is string 6
- `shapeNotes(frets): { midi: number; position: FretPosition }[]` — low to high
- `shapePitchClasses(frets): number[]`
- `shapeLowestMidi(frets): number`
- `fretSpan(frets): number`

**`src/curriculum/data/guitar/types.ts`**

- `GuitarKeyName = 'C'|'G'|'D'|'A'|'E'|'B'|'F#'|'Db'|'Ab'|'Eb'|'Bb'|'F'`
- `BookChordQuality = 'maj'|'min'|'maj7'|'min7'|'dom7'|'min7b5'`
- `MusicMapRhythm = 'whole'|'dotted-half'|'half'|'dotted-quarter'|'quarter'|'eighth'|'half-rest'|'quarter-rest'|'eighth-rest'`
- `GuitarScalePosition { id: 'major'|'pentatonic'; fretStart; fretEnd; unusedStrings: GuitarStringNumber[]; playOrder: FretPosition[] }` — tonic to tonic, ascending
- `GuitarFingerPlacement { finger: 1|2|3|4; string; fret }`
- `GuitarBarre { fret; fromString; toString; finger: 1|3 }`
- `GuitarChordShape { degree: 1..7; quality; frets: string; diagramStartFret: number; fingering: readonly GuitarFingerPlacement[]; barre?; isOctaveRepeat?: true; erratumIds?: readonly string[] }`
- `MusicMapBar { degree; quality; frets: string; diagramStartFret?: number; rhythm: readonly MusicMapRhythm[]; erratumIds? }` — `diagramStartFret` is authored where the extraction notes give the window
- `GuitarMusicMap { example: 1|2|3|4|5; bars: readonly MusicMapBar[]; page: 'triad-maps'|'seventh-maps'; repeat: boolean; erratumIds? }` — the label is derived
- `GuitarKeyCenter { key; displayName; source: { pdfPages: readonly [number, number] }; signatureText; scaleNotes; pentatonicNotes; majorScale; pentatonic; triads (6); sevenths (8); musicMaps (5) }`

**`src/curriculum/data/guitar/bookOne/{C,G,D,A,E,B,Fsharp,Db,Ab,Eb,Bb,F}.ts` and `bookOne/index.ts`**

- `index.ts` exports:
  - `GUITAR_ATLAS_BOOK_ONE: Readonly<Record<GuitarKeyName, GuitarKeyCenter>>`
  - `GUITAR_KEY_ORDER` (book order C G D A E B F# Db Ab Eb Bb F)
  - `isGuitarKeyName`, `getGuitarKeyCenter(key: string)`
  - `chordRootName(center, degree)` — ASCII via `spellScale`
  - `chordName(...)` — e.g. `'B minor 7(b5)'`
  - `chordSymbol(...)` — e.g. `'Bm7b5'`
  - `hybridLabel(...)` — e.g. `'7 min7(b5)'`
  - `mapLabel(map)` — `'Example 5: Four Bars'`
  - `ENGINE_QUALITY: Record<BookChordQuality, DetectorChordQuality>`
  - `getGuitarShape(shapeId)` — shape ids are `C/triad/1`, `C/seventh/8`, `C/map/4/2`
  - `pageShapeFor(bar)` — returns the chord-page shape when the map draws the same voicing, so it can reuse the fingering
- **How the files are authored:** a one-time generator (`scripts/guitar/generateBookOneData.ts`, run with `npx tsx`, committed for provenance) reads the fixture, applies the errata, and emits the key files. After that the committed `.ts` files are the source of truth.
- **Fields kept from `keys.json`:**
  - `key`, `pdfPages`, `signatureText`, `scaleNotes`, `pentatonicNotes`
  - `majorScale` / `pentatonic`: `{fretStart, fretEnd, unusedStrings, dots}`, sorted into play order
  - `triads` / `sevenths`: `{index → degree, quality, frets → shape string, diagramStartFret, barre parsed from the free text "fret N, strings a-b, index|ring", fingering, isOctaveRepeat}`
  - `musicMaps`: `{progressionText → degree + quality, chordShapesShown → frets, rhythmPerBar, repeatSigns}`
- **Dropped from runtime data** (fixture only): `soundingNotes`, `playOrderNotes`, `pitchCheckPasses`, `shapeAsPrinted`, printed `name` / `chords`, `exampleLabel`.
- **Dropped entirely:** `handGraphicFrets`, prose `notes` and `errata`. Their content moves to the errata doc.

**`src/curriculum/data/guitar/__fixtures__/bookOne.extraction.json`** — the slim extraction above, including the as-printed names, labels, `soundingNotes` and `playOrderNotes`. Tests read it with `readFileSync(resolve(process.cwd(), …))`, following the pattern in `src/constants/hosts.test.ts`.

**`src/curriculum/data/guitar/bookOneErrata.ts`**

- `GuitarAtlasErratum { id; key: GuitarKeyName|'ALL'; pdfPage; printedPage?; location; kind: 'chord-shape'|'shape-caption'|'chord-name'|'fret-label'|'fingering'|'rhythm-notation'|'example-label'|'octave-box'|'page-number'|'typography'|'content-question'; asPrinted; correction; appDataChanged: boolean; targets?: string[] }`

**Errata that change app data** (listed in `GUITAR_ATLAS_BOOK_ONE_ERRATA`):

- Ab 7th box 6 Fm7: `X-7-9-7-8-X` → `X-8-10-8-9-X`; barre and fingering shifted up one fret; diagram start fret 7.
- Bb triad 2 and Eb triad 6, C minor: `X-3-5-3-4-X` → `X-3-5-5-4-X`; fingering index s5 f3, middle s2 f4, ring s4 f5, pinky s3 f5; no barre.
- Db Maps Ex1–3 get the Db triad-page shapes:
  - Db: `X-4-6-6-6-X`
  - Gb: `2-4-4-3-X-X`
  - Ebm: `X-6-8-8-7-X`
- Eb Map Ex3: Fm `X-8-10-10-9-X`, Cm `8-10-10-8-X-X`.
- Db and Eb octave boxes: see decision 13.
- Printed captions that differ from the drawn shape (the app uses the drawing; logged against the shape):
  - G 7th box 8: printed `X-10-12-11-10-X`, drawn `X-10-12-11-12-X`
  - Db triad 4: printed `X-2-4-4-3-X`, drawn `2-4-4-3-X-X`
- Chord-name typos:
  - A Ex3 "F# major" → F# minor
  - A Ex4 bar 4 "D minor 7" → D major 7
  - E Ex5 bar 2 "G# minor" → G# minor 7
  - Ab Ex5 bar 3 "Ab major" → Ab major 7
- The second map labelled "Example 4" becomes Example 5 (one `'ALL'` entry).
- Db Ex2 bar 2: missing augmentation dot; the app uses a dotted quarter.
- Fingering fixes:
  - C: G major hand "3 2 3" → "2 3 3"
  - G: Am "2 2 1" → "1 2 2"
  - E: E major "2 2 1" → "1 2 2"
  - E and B: G#m gets an index barre at fret 4, strings 6–3

**Logged only, no data change:**

- Page-number misprints (C 7th-chord page prints "15"; A scale page prints "26").
- `7( ♭5)` spacing, B pentatonic caption capitalisation, PDF text-layer flat glyph drops.
- Content questions: triad bars inside 7th-chord maps (D, A, E, B, Ab, Eb, F); map voicings that differ from the chord pages.
- Page-to-page fingering differences: F#m on A vs E; C7 vs F7 grips.
- Source-PNG vs PDF differences, in an appendix.

**`docs/guitar-atlas/book-one-errata.md`** — the errata document for the next edition. It has:

- a table per key: id, PDF / printed page, location, as printed, correction, status (Corrected in app / Logged)
- "Questions for the author"
- "Source asset notes"

**`src/curriculum/data/activityFlows/guitarAppliedTheory.ts`** — `export function buildGuitarAppliedTheoryFlow(keyName: string): ActivityFlowV2`

- An unknown key falls back to C, the same as piano's fallback to MIDI 60.
- Content helpers:
  - `scaleNotes(pos, dir)` — follows `generateScale`: ascending; descending; or ascending plus the reversed notes without the top; onset i×480, duration 460
  - `contourNotes(pos, degrees, durations)`
  - `shapeNotes(shape)`
  - `arpeggioNotes(shape)` — onset i×480, duration 460
  - `strumNotes(shapes, spacing, durations?)` — duration defaults to spacing − 20, as `chordBlockNotes` does
  - `mapNotes(map, passes = 2)`
  - `chordTargetsFor(...)`
- Builders: `gScaleStep`, `gMelodyStep`, `gArpeggioStep`, `gChordStep`, `gMapStep`, driven by a running step counter.
- Each step carries `guitar: GuitarStepMeta`.

**`src/curriculum/utils/flowInstrument.ts`** — `flowInstrument(flow: ActivityFlowV2): LessonInstrument` (returns `params.instrument ?? 'piano'`).

### Changed files

**`src/curriculum/types/activity.v2.ts`** (all additions optional):

- `export type LessonInstrument = 'piano' | 'guitar'`
- `ActivityFlowParamsV2` (`:33-36`): add `instrument?: LessonInstrument`
- `TargetNote` (`:40-45`): add `fretPosition?: FretPosition` (type imported from `@/lib/guitar/fretboard`)
- `export type DetectorChordQuality = 'major'|'minor'|'major7'|'minor7'|'dominant7'|'minor7b5'`
- `export interface ChordTarget { rootPc: number; quality: DetectorChordQuality; pitchClasses: number[]; bassPc: number; onsetTick: number; durationTicks: number; symbol: string; shapeId: string; attack: 'strum'|'arpeggio' }`
- `export interface GuitarStepMeta { keyCenter: string; scalePosition?: 'major'|'pentatonic'; shapeIds?: string[]; musicMap?: { example: 1|2|3|4|5; passes: number } }`
- `ActivityStepV2` (`:55-74`): add `chordTargets?: ChordTarget[]` and `guitar?: GuitarStepMeta`
- `InstrumentConfig` (`:20-26`): no change (decision 2)

**`src/curriculum/engine/genreGeneration/resolveStepContent.ts`**

- `GenreNoteEvent` (`:16-22`): add `fretPosition?: FretPosition`
- `StepContext` (`:24-31`): add `instrument?: LessonInstrument`
- `resolveStepContent` (`:148-161`): add the guitar early return before `applyRegisterRules`
- `resolveRawStepContent`: after Priority 1 (`:193-196`), if `ctx.instrument === 'guitar'`, warn and return `null`

**`src/curriculum/pages/GenreLessonContainerV2.tsx`** (`:331-343`)

- Add `instrument: flow.params.instrument` to the StepContext literal and to the `useMemo` deps. Everything else here belongs to the UI sub-plan.

**`src/curriculum/data/activityFlows/appliedTheoryFundamentals.ts`** — only add `export` to existing constants, no logic change:

- `MAJOR_SCALE_INTERVALS`, `TICKS_PER_BEAT` (`:36-37`)
- `STACCATO_DURATION`, `LEGATO_DURATION`, `NORMAL_DURATION` (`:148-150`)
- `CONTOUR_A_DEGREES`, `CONTOUR_CONNECTED_DEGREES` (`:174-175`)
- `PROGRESSION_DEGREES`, `SHUFFLED_PROGRESSION_DEGREES` (`:453`, `:457`)
- `WHOLE_NOTE` … `EIGHTH_NOTE` (`:459-462`)

The golden snapshot guards this.

**Route and tile wiring** belongs to the IA sub-plan. It consumes `buildGuitarAppliedTheoryFlow`, following the `AppliedTheoryFundamentalsLessonRoute` pattern (`routes.tsx:53-74`) with `genre="guitar-applied-theory-fundamentals"`.

## Step enumeration

Piano-mirrored steps copy piano's activity titles and assessments exactly; piano tag suffixes are reused.

**Content sources:**

- **MS:** major-scale position
- **PS:** pentatonic position
- **TP:** triad-page shapes
- **7P:** 7th-page shapes
- **MM:** map bars

**Assessment abbreviations:** PO = `pitch_only`; POT = `pitch_order_timing`; POTD = `pitch_order_timing_duration`.

**Section A: Melody**

| #     | Activity                                                                                                              | Assessment          | Source         |
| ----- | --------------------------------------------------------------------------------------------------------------------- | ------------------- | -------------- |
| 1–6   | A1.1–A1.6 Major Scale: Ascending / Descending / Asc & Desc × Out of Time, In Time (8 / 8 / 15 notes)                  | PO, POT alternating | MS             |
| 7–10  | A2.1–A2.4 3 Note Contour [1,2,3]; Connect Two [1,2,3,3,2,1]; each OOT then IT                                         | PO, POT             | MS degrees 1–3 |
| 11–14 | A3.1–A3.4 Staccato 120 / Legato 440 / Mixed [120,440,120] / Connect Two Mixed                                         | POTD                | MS             |
| 15–20 | **New** A4.1–A4.6 Major Pentatonic: Asc / Desc / Asc & Desc × OOT, IT (6 / 6 / 11 notes); suffix `pentatonic_scale_*` | PO, POT             | PS             |

**Section B: Chords**

| #     | Activity                                                                                                                        | Assessment       | Source       |
| ----- | ------------------------------------------------------------------------------------------------------------------------------- | ---------------- | ------------ |
| 21–28 | B1.1–B1.8 Arpeggiate The 1 / 2 / 3 / 4 Chord, each OOT then IT                                                                  | PO, POT          | TP 1–4       |
| 29–32 | B2.1–B2.4 Play Chords 1,2,3,4: OOT (spacing 960) / Whole / Half / Quarter                                                       | PO, then POTD ×3 | TP           |
| 33–35 | B3.1 [1,4] staccato; B3.2 [1,4] legato; B3.3 [1,2,3,4] mixed. Quarter-note spacing (deviation, decision 8)                      | POTD             | TP           |
| 36–40 | B4.1–B4.5 order [4,2,1,3]: OOT 960 / Half / Quarter / Eighth / [H,Q,E,Q]                                                        | PO, then POTD ×4 | TP           |
| 41–44 | **New** B5.1–B5.4 Arpeggiate The 5 / 6 Chord, each OOT then IT; suffix `arpeggio_degree{5,6}_*`                                 | PO, POT          | TP 5–6       |
| 45–48 | **New** B6.1–B6.4 Play Chords 1–6: OOT / Whole / Half / Quarter; suffix `play_chords_1to6_*`                                    | PO, POTD ×3      | TP           |
| 49–62 | **New** B7.1–B7.14 Arpeggiate the 1–7 7th chords, each OOT then IT; suffix `arpeggio_7th_degree{n}_*`                           | PO, POT          | 7P boxes 1–7 |
| 63–66 | **New** B8.1–B8.4 Play 7th Chords 1–7 and 1: OOT / Whole / Half / Quarter (8 chords, octave box last); suffix `play_sevenths_*` | PO, POTD ×3      | 7P boxes 1–8 |

**Section D: Play-Along**

| #     | Activity                                                                                                                                                 | Assessment | Source |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ------ |
| 67–68 | D1.1–D1.2 Three Note Contour / Connect Two, Play Along                                                                                                   | POTD       | MS     |
| 69–70 | D2.1 [1,4] half notes; D2.2 [1,2,3,4] quarter notes                                                                                                      | POTD       | TP     |
| 71–75 | D3: Music Maps (replaces Two-Hand), Examples 1–5. Book rhythms including rests, eighths and dotted values; repeat played twice; suffix `music_map_ex{n}` | POTD       | MM     |

**Totals:** 75 steps (A 20, B 46, D 9). Piano has 43; guitar's D count is also 9.

**Chord data per step type:**

- Strummed steps (B2, B3, B4, B6, B8, D2, D3): `chordSymbols` has one symbol per chord change, like piano. For maps it is one per bar.
- Arpeggio steps (B1, B5, B7): one symbol.
- `chordTargets` is present on every B and D2/D3 step.

**Guitar direction copy.** Instrument-neutral piano copy is reused word for word (A1 in-time steps, A2, D1, D2, and all activity titles and success feedback except D3). The replacements:

| Piano wording                                          | Guitar wording                                                                                                       |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| "going up (to the right)" / "going down (to the left)" | "from the lowest note to the highest" / "from the highest note to the lowest", "using the shape shown"               |
| B1 / B5 / B7 out-of-time                               | "Fret the {X} shape shown, then pick each string one at a time, from the lowest string to the highest."              |
| B1 / B5 / B7 in-time                                   | "In a steady tempo, pick each string of the {X} shape one at a time, lowest to highest."                             |
| "holding down each chord one by one"                   | "strum each chord and let it ring before moving to the next shape"                                                   |
| "play … in whole notes"                                | "strum … in whole notes"                                                                                             |
| B3 staccato / legato / mixed                           | "mute the strings right after each strum" / "let each chord ring into the next" / "mix muted and ringing strums"     |
| D3                                                     | "Strum this Music Map in the rhythm shown and play it twice (repeat sign); rests mean silence, so mute the strings." |

No step uses "to the right", "holding down" or "both hands".

## Reuse list

- `midiToPitchName`, `spellScale`, `pitchNameToMidi` — `src/curriculum/engine/genreGeneration/enharmonicEngine.ts` (`pitchNameToMidi` is the fixture oracle in tests)
- `CHORDS` — `src/daw/prism-engine/data/chords.ts`
- `parseChord`, `normalizeQuality`, `formatChord` — `src/lib/chordNotation`
- `chordSymbolTones` — `src/curriculum/engine/genreGeneration/chordSymbolTones.ts`
- `placeLessonChords`, `chordsPerBar` — `src/curriculum/notation/lessonChordSymbols.ts`
- Timing and degree constants exported from `appliedTheoryFundamentals.ts`
- `resolveStepContent` (Priority 1 path) and `useGenreProgress` (tag-keyed)
- `urlParamToKeyLabel` — for the route
- `AudioChordDetector` quality keys — `src/daw/audio/AudioChordDetector.ts`

## Risks and mitigations

- **Piano drift.** Commit 1 is golden snapshot tests only:

  - `JSON.stringify(buildAppliedTheoryFundamentalsFlow(k))` for all 12 keys
  - resolved notes for every piano step via `resolveStepContent` with no `instrument` set

  All later commits must keep them passing.

- **Fast chord changes are below the detector's vote window** (B4.4, B4.5, eighth-note maps). The data gives explicit windows per target. The evaluator sub-plan must analyse onset-aligned windows rather than the smoothed vote. The 60 BPM floor helps.
- **Detector naming ambiguity** (Am7 vs C6, a maj7 with a weak 7th). `pitchClasses` and `bassPc` are on every target.
- **High octave boxes** (D at 19, Eb at 20): needs the author's confirmation. The data change is one line.
- **46 progress dots in section B.** The UI sub-plan must wrap or scroll them.
- **Wrong enharmonic names** (E#, Gb, Cb): names come from `spellScale` and are checked against the fixture.
- **Existing piano quirks mirrored or left alone:** dorian key colour from the missing `'major'` entry; progress not stored per key; the piano "up and down" arpeggio copy. The piano B3 onset bug is not mirrored (decision 8).

## Tests

1. **`src/curriculum/__tests__/applied-theory-fundamentals.golden.test.ts`** (+ snapshot) — written first.
2. **`src/lib/guitar/__tests__/fretboard.test.ts`** — tuning; `parseShape` round-trip; `X-3-2-0-1-0` gives MIDI [48, 52, 55, 60, 64].
3. **`src/curriculum/data/guitar/__tests__/bookOne.integrity.test.ts`**, for all 12 keys:
   - Scale positions:
     - The major scale has 8 strictly ascending notes on strings 6–4, and the pentatonic has 6 on strings 3–1.
     - Both begin and end on the tonic, an octave apart.
     - Every note is in the major (or pentatonic) set, and every degree is covered.
     - Frets lie within the diagram window (open strings allowed).
     - `scaleNotes` equals `spellScale`.
   - Chord pages:
     - Triads are degrees 1–6 with qualities maj, min, min, maj, maj, min.
     - Sevenths are 1–7 plus 1, with qualities maj7, min7, min7, maj7, dom7, min7, min7b5, maj7.
     - Pitch classes equal `CHORDS[ENGINE_QUALITY[q]]` from the root, and the lowest note is the root.
     - The octave box's lowest note is 12 semitones above box 1's.
     - Fingering covers every fretted string (or the barre does) with matching frets; span ≤ 4.
   - Maps:
     - 5 examples with 1, 2, 2, 4, 4 bars.
     - Each bar sums to 1920 ticks.
     - Each bar's degree and quality are diatonic (triad or 7th).
     - Shape pitch classes match the chord, and the root is lowest.
     - `hybridLabel` joined reproduces the fixture's `progressionText`.
   - Fixture diff: any difference in frets, fingering, barre, name, label or rhythm must cite an erratum whose `asPrinted` matches.
   - Errata cross-checks:
     - Every `erratumIds` entry exists.
     - Every erratum with `appDataChanged` is referenced by at least one data item.
     - Every erratum id appears in `docs/guitar-atlas/book-one-errata.md`.
   - Every quality in `DetectorChordQuality` is a `CHORDS` key.
4. **`src/curriculum/__tests__/guitar-applied-theory.test.ts`**, for all 12 keys:
   - Step counts are 20 / 46 / 9; tags are unique; `params.instrument === 'guitar'`.
   - Every step has non-empty `targetNotes`, and each note has a `fretPosition` with `midi === fretToMidi(fretPosition)`.
   - Parity with piano for A1–A3, B1, B2, B4, D1 and D2: same subsection, activity, assessment and tag suffix; same onsets and durations (scales, contours, block chords); same scale-degree sequence or pitch-class set per onset.
   - B3: pitch-class and duration parity only, with onsets on the quarter-note beat.
   - `chordTargets` line up with the distinct chord onsets, and their pitch classes equal the notes sounding at each onset.
   - D3 onsets reproduce the rhythms including rests, over 2 passes.
   - Unknown key falls back to C.
5. **`src/curriculum/engine/genreGeneration/__tests__/resolveStepContent.instrument.test.ts`**:
   - Guitar notes come back unshifted, even a chord above C5.
   - A guitar step without `targetNotes` returns `null`.
   - The piano path matches the golden snapshot.

Run `npx tsc -b` and vitest after each commit.

**Suggested commit order:**

1. Golden snapshot tests
2. `lib/guitar/fretboard.ts`
3. Type additions
4. Fixture, generator, data, errata and doc
5. Integrity tests
6. Resolver bypass and container context
7. Flow builder and tests

The IA route and UI work come after.

## Open questions

1. **Db / Eb octave box.** Should box 8 be a true octave (`X-16-18-17-18-X` and `X-18-20-19-20-X`, reaching fret 20)? Or should the book's box stay, relabelled as a "return to 1" chord in the same register? The default is the true octave.
2. **Triad bars in the 7th-chord maps** (D, A, E, B, Ab, Eb, F). Keep them as printed (the default, logged as questions for the author), or change the "5 maj" bars to "5 dom7"?
3. **Piano B3 bug.** Piano B3 uses each chord's length as its spacing too (onsets 0/140 ticks). Guitar is fixed. Should piano get the same fix later, in a separate change that deliberately breaks the byte-identical requirement?
4. **Music Map repeats.** Play each map twice (the default) or once?

### Critical Files for Implementation

- /Users/marfizo/Documents/Full App Code/Webapp-Refactor/src/curriculum/data/activityFlows/appliedTheoryFundamentals.ts
- /Users/marfizo/Documents/Full App Code/Webapp-Refactor/src/curriculum/types/activity.v2.ts
- /Users/marfizo/Documents/Full App Code/Webapp-Refactor/src/curriculum/engine/genreGeneration/resolveStepContent.ts
- /Users/marfizo/Documents/Full App Code/Webapp-Refactor/src/curriculum/pages/GenreLessonContainerV2.tsx
- /private/tmp/claude-501/-Users-marfizo-Documents-Full-App-Code/d42ea94e-5c24-4a5d-93d6-46fbf1ed87c1/scratchpad/keys.json
