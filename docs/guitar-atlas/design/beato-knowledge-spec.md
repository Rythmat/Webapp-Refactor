# The Beato Book in the Guitar section: integration spec

## Summary

- **Inputs.** The five readers returned about 190 items. Those merge into **23 V1 items** (data plus small UI, all derived from Book One data), about 60 future-curriculum topics in six groups, and 14 inspiration-only items. Nothing in V1 adds new graded lesson content. Every V1 item explains or labels a scale, shape or map Book One already teaches.
- **Copy.** All user-facing copy is newly written: 72 theory notes plus 60 UI strings. The 7-word copy check finds **0 overlaps** with the book. See the last section.
- **Voicing families were verified against `keys.json` with the planned corrections applied.** Scripts are in `/private/tmp/claude-501/-Users-marfizo-Documents-Full-App-Code/d42ea94e-5c24-4a5d-93d6-46fbf1ed87c1/scratchpad/beato_spec/`: `voicing_classify.py`, `final_counts.py` and `map_patterns.py`.
  - All 168 chord-page entries and all 156 Music Map bars classify cleanly.
  - Run on the uncorrected data, the classifier flags exactly the logged shape and chord-name errata, so it can double as an errata guard.
  - `X-3-5-4-5-X` (Cmaj7, root on string 5) **is a drop 2** in root position: R-5-7-3.
  - `3-X-4-4-3-X` (Gmaj7, root on string 6) **is a drop 3** in root position: R-7-3-5, with string 5 muted.
  - The 7th pages hold 67 drop 2 shapes, 27 drop 3 shapes and 2 open-string voicings (Emaj7, Fmaj7). No triad is a drop voicing, because drop names need four different notes.
- **Reader claims corrected during verification:**
  - Quality changes move **one note**, not "one finger". Book One fingerings reassign fingers: C7 uses an index barre and Cmaj7 does not.
  - The drop-3 muting tip names "the finger on string 6", not "your first finger". Book One uses finger 1 on 11 of its root-6 grips and finger 2 on 16.
  - "Harmonic rhythm: two chords per bar" is dropped. Every Book One Music Map has one chord per bar.
  - The G-string guide-tone line example uses a G7 grip that the C key doesn't use (the book's is `X-10-12-10-12-X`). It moves to future voice-leading work.
  - The finger-per-fret rule needs an open-position case. Otherwise G pentatonic would put finger 1 on fret 2.
- **New scoring finding.** In Studio's `AudioChordDetector`, the parsimony step can report a **same-root simpler chord, usually the triad, for a correctly played 7th** (Cmaj7 heard as C). Its pitch-class twins (Am7 = C6, Bm7♭5 = Dm6) can also win on label. Guitar scoring must therefore compare pitch-class sets and check the chroma for the 7th. It must not use the label alone to say "you left out the 7th".
- **Files.** Everything is in `/private/tmp/claude-501/-Users-marfizo-Documents-Full-App-Code/d42ea94e-5c24-4a5d-93d6-46fbf1ed87c1/scratchpad/beato_spec/`:
  - `spec.md`: this document
  - `copy.json`: all copy, as data
  - `make_copy.py`: the copy source
  - `copycheck.py`: the copy checker
  - `build_spec.py`: rebuilds this spec and re-runs both checks
- **Out of scope here.** The relayed request's first line, reusing Studio's guitar amps, is already covered by plan decision 9. This spec doesn't change it.

## V1 integration spec

### 0. Guardrails

1. **Derive, don't store.** Formula labels, chord-tone labels, family tags, aliases, Roman numerals, patterns and anchors are all computed from key + degree + quality + shape. That follows the plan's rule for chord names. Only the copy strings are authored.
2. **Display only.** V1 never changes which notes a step grades. Alternate voicings, variations and new exercises are future work.
3. **Detection never blocks.** New diagnostics can turn a result into `unclear` or add a hint. They never create a new failure path.
4. **One idea at a time.** Each step shows at most one auto-opened intro note. Everything else sits behind the (i) drawer or a popover, and one diagnostic hint is shown per take.
5. **Original wording only.** No Beato prose, tables, exercise sequences, diagrams or naming systems. Standard terms (drop 2, half-diminished, circle of fifths, Roman numerals) are fine.

### 1. What V1 includes (merged)

Tier **core** ships with the P4/P5 visuals and data. Tier **plus** ships in P6/P6b/P8 and can slip without blocking launch.

| #     | Item                                                                                                                                                             | Tier      | Merged from (reader item topics)                                                                                                                                                                   |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| V1-01 | Formula line and quality name on every ChordBox (`R 3 5`, `R ♭3 ♭5 ♭7`), with the nickname "half-diminished (ø)" on chord 7                                      | core      | ch1a triad/7th formulas; ch2 chord-tone labels; ch3 triad, 7th and half-dim formulas; ch4-5 7th formulas                                                                                           |
| V1-02 | "Chord tones" label mode (R/3/♭3/5/♭5/7/♭7) on ChordBox, Fretboard and arpeggio TAB                                                                              | core      | ch1a tone order; ch1b role labels; ch2 labels and arpeggio order; ch3 degree/interval labels; ch4-5 key vs chord numbers                                                                           |
| V1-03 | "Key numbers" label mode (1–7) on Fretboard, ScaleBox and TAB, with traditional degree names in a note                                                           | core      | ch1a degree names; ch3 labels; ch4-5 key numbers                                                                                                                                                   |
| V1-04 | Voicing-family tag, Movable/Open badge and low-to-high tone order on ChordBox                                                                                    | core      | ch2 drop 2/drop 3, movable vs open, open-string voicings; ch3 root-6/root-5 families                                                                                                               |
| V1-05 | Drop-voicing explainer (collapsible) and drop-3 muting tip                                                                                                       | core      | ch2 "what drop means", drop-3 family                                                                                                                                                               |
| V1-06 | One-note-apart quality ladder: an info note (core) plus a derived "Same root, four kinds" compare panel with Hear it (plus)                                      | core/plus | ch1a one-fret changes; ch2 one-fret changes                                                                                                                                                        |
| V1-07 | "Triad plus one" and the hidden triad popover (Cmaj7 without C = E minor = your chord 3)                                                                         | core      | ch1b 7th = triad + note; ch3 stacked third                                                                                                                                                         |
| V1-08 | "Also written as" aliases (core) and a Roman-numeral display setting (plus, teacher/classroom)                                                                   | core/plus | ch1a aliases, Roman; ch1b aliases, Roman; ch2, ch3, ch4-5 aliases                                                                                                                                  |
| V1-09 | A1 scale layer: W/H step chips, octave connector, suggested finger per dot, restless 4 and 7, Ionian popover                                                     | core      | ch1a octave, W/H, tendency tones, Ionian; ch3 one finger per fret                                                                                                                                  |
| V1-10 | A4 pentatonic layer: "major minus 4 and 7", ghost outlines for 4 and 7 (plus), G–B tuning note, octave, relative-minor fact                                      | core      | ch1a pentatonic; ch2 G–B tuning; ch3 formula; ch4-5 pentatonic, relative minor                                                                                                                     |
| V1-11 | A2/A3 copy: ending on 1, guitar staccato and legato wording                                                                                                      | core      | ch1a tendency; plan wording table                                                                                                                                                                  |
| V1-12 | Section B bridge: chords come from the scale, key chord-family strip, where chord 7 went                                                                         | core      | ch1a stacking thirds, pattern; ch2 why triads stop at 6; ch3 diatonic family                                                                                                                       |
| V1-13 | Arpeggio copy: arpeggio vs strum, tone order, doubled notes, listen for the 3                                                                                    | core      | ch1a harmonic vs melodic, tone order; ch1b arpeggio roles; ch2 order, doubling                                                                                                                     |
| V1-14 | Strum copy: start on the root, X strings, rhythm first, mixed order, muted short chords                                                                          | core      | ch1b root position; ch2 skip X; ch3 root position; ch4-5 rhythm first, mute                                                                                                                        |
| V1-15 | Change helpers: keep-a-finger-down anchors, shared-note badge, "tricky change" flag                                                                              | plus      | ch1b voice-leading anchors, shared notes                                                                                                                                                           |
| V1-16 | B8 layer: top-line cue on same-family runs, octave-return copy                                                                                                   | plus      | ch2 top note climbs; ch1b chords climb the neck                                                                                                                                                    |
| V1-17 | Key intro: one new note per key, circle-of-fifths order, relative minor                                                                                          | core      | ch1a relative minor, cycle; ch1b circle; ch4-5 fifths order                                                                                                                                        |
| V1-18 | Music Map chips: 2-5-1, turnaround, 5 → 1; same-fret root move; why 5 pulls to 1; starts on 6; chord 7; triad bar in a 7th map; listen first; pentatonic jam tip | core      | ch1a 2-5-1, function, 7 chord, triad in 7th map; ch1b root motion, guide tones, chips, listen first; ch2 guide tones; ch3 one scale fits the map (tip only); ch4-5 jam, 2-5-1 roles, root shortcut |
| V1-19 | Function badges Home/Away/Tension (toggle, off by default)                                                                                                       | plus      | ch1a function groups                                                                                                                                                                               |
| V1-20 | Practice-tool defaults: clean pass, ladder step-back, loop presets, one-focus tip, hand-care tip and break chip                                                  | plus      | ch3 clean before fast, one focus; ch4-5 phrase chunks; ch2 hand care                                                                                                                               |
| V1-21 | Chord-tone diagnostics rules for P6 (twins, parsimony, rootless, missing 3, X strings, per-string naming, spelling)                                              | plus (P6) | ch1a quality tones, confusions, spelling; ch1b wrong bass, 3rd; ch2 per-string, rootless; ch3 bass check, twins                                                                                    |
| V1-22 | ChordBox up-the-neck orientation: start-fret number plus hollow inlay markers                                                                                    | plus      | ch2 chord-box orientation                                                                                                                                                                          |
| V1-23 | Integrity tests: voicing family per shape, templates, patterns, copy lint                                                                                        | core      | ch2 classifier; ch1a quality-family test                                                                                                                                                           |

**Considered and dropped from V1.** Each goes to the future list unless the reason says otherwise.

- Two-chords-per-bar harmonic rhythm: not in Book One maps.
- "Stay close" alternate voicings and "Try a variation" chord swaps: these add new shapes and chords.
- The hand-zone bracket: book grips often jump, with 0 shared positions in most 7th-map changes.
- The G-string line demo: needs non-book grips.
- The interval fret-ruler and interval explorer.
- Scale in 3rds, zig-zag arpeggios, rhythm remix, tonic drone, ear games, planner, log, cycle drill, bass+strum, finger permutations and pick/p-i-m-a marks: all new exercises or modes.
- The "7 min7(♭5) vs 5 dom7: check your lowest note" hint: this one is removed, not moved to future. It isn't a real bass problem, and the generic diagnostics cover it.

### 2. Data additions

#### 2.1 Files (all new, pure functions, no piano impact)

| File                                             | Contents                                                                                                                                  |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/guitar/theory/types.ts`                 | Types below                                                                                                                               |
| `src/lib/guitar/theory/chordTones.ts`            | `CHORD_FORMULA`, `QUALITY_TONES`, `chordToneLabel`, `shapeToneLabels`, `spellChordTones`, `formulaText`                                   |
| `src/lib/guitar/theory/voicing.ts`               | `dropFamily`, `classifyVoicing`, `FAMILY_TEMPLATES`, `compareShapes` (quality ladder)                                                     |
| `src/lib/guitar/theory/keyTheory.ts`             | `DIATONIC_TRIADS`, `DIATONIC_SEVENTHS`, `FUNCTION_OF_DEGREE`, `relativeMinor`, `keyChange`, `romanNumeral`, `chordAliases`, `hiddenTriad` |
| `src/lib/guitar/theory/scaleTheory.ts`           | `stepSizes`, `octavePairs`, `suggestedFingers`, `pentatonicGhosts`                                                                        |
| `src/lib/guitar/theory/mapAnalysis.ts`           | `analyzeMusicMap`, `analyzeChange`, `topLineRuns`, `octaveReturnKind`                                                                     |
| `src/lib/guitar/theory/diagnostics.ts`           | Chord-tone diagnostic rules (section 5), consumed by `useGuitarLessonEvaluation`                                                          |
| `src/curriculum/data/guitar/theoryNotes.ts`      | `GUITAR_THEORY_NOTES` (copy, section 6) and `resolveTheoryNote`                                                                           |
| `src/curriculum/data/guitar/theoryConditions.ts` | Condition predicates and token resolvers                                                                                                  |

#### 2.2 Types

```ts
// src/lib/guitar/theory/types.ts
import type { BookChordQuality } from '@/curriculum/data/guitar/types'; // 'maj'|'min'|'maj7'|'min7'|'dom7'|'min7b5'
import type { GuitarStringNumber } from '@/lib/guitar/types';

export type ChordToneLabel = 'R' | '3' | 'b3' | '5' | 'b5' | '7' | 'b7'; // rendered with ♭ via formatAccidental
export type ChordToneRole = 'root' | 'third' | 'fifth' | 'seventh';
export type KeyDegree = 7 | 6 | 5 | 4 | 3 | 2 | 1; // scale degree in a major key
export type LabelMode = 'fingers' | 'notes' | 'keyNumbers' | 'chordTones';

export interface ShapeTone {
  string: GuitarStringNumber;
  fret: number;
  midi: number;
  label: ChordToneLabel;
  role: ChordToneRole;
  noteName: string; // key-aware spelling (spellChordTones), e.g. 'E#', 'Bb'
  isQualityTone: boolean; // role ∈ QUALITY_TONES[quality]
}

export type VoicingFamily =
  | 'open-chord'
  | 'root6-full-barre'
  | 'root6-four-string'
  | 'root5-four-string'
  | 'root4-four-string' // triads
  | 'drop2'
  | 'drop3'
  | 'close'
  | 'drop2and4'
  | 'drop2and3' // 4 distinct notes
  | 'open-string-seventh'
  | 'unclassified';

export interface VoicingInfo {
  family: VoicingFamily;
  rootString: GuitarStringNumber; // string of the lowest sounding note
  stringSet: string; // e.g. '5-4-3-2', '6-4-3-2'
  toneOrder: ChordToneLabel[]; // low → high
  distinctTones: number; // 3 for triads, 4 for 7ths
  doubledTones: ChordToneLabel[]; // [] for drop voicings
  usesOpenStrings: boolean;
  movable: boolean; // !usesOpenStrings
  mutedStrings: GuitarStringNumber[];
  skippedStrings: GuitarStringNumber[]; // muted strings between lowest and highest played ([5] for drop 3)
  isRootPosition: boolean; // toneOrder[0] === 'R' (all Book One shapes)
  barre: 'none' | 'partial' | 'full'; // from GuitarChordShape.barre
}

export type FunctionGroup = 'home' | 'away' | 'tension';
export type MapPatternId = 'two-five-one' | 'turnaround-1625' | 'five-to-one';
export interface MapPattern {
  id: MapPatternId;
  startBar: number;
  length: 2 | 3 | 4;
  wrapsRepeat: boolean;
}
export interface ChangeInfo {
  fromBar: number;
  toBar: number;
  wrapsRepeat: boolean;
  sharedPitchClasses: number[];
  anchors: {
    string: GuitarStringNumber;
    fret: number;
    finger: 1 | 2 | 3 | 4;
  }[]; // same string+fret+finger, fret > 0
  sameFretRootMove?: 'r6-to-r5' | 'r5-to-r6'; // fret > 0 only
  isTricky: boolean; // sharedPitchClasses.length === 0
}
export interface MusicMapAnalysis {
  degrees: KeyDegree[];
  functions: FunctionGroup[];
  patterns: MapPattern[];
  changes: ChangeInfo[];
  startsOnSix: boolean;
  hasSevenChord: boolean;
  triadBarsIn7thMap: number[];
  dom7ToOne: number[]; // bar indexes
}

export type GuitarSubsectionPrefix =
  | 'KEY'
  | 'A1'
  | 'A2'
  | 'A3'
  | 'A4'
  | 'B'
  | 'B1'
  | 'B2'
  | 'B3'
  | 'B4'
  | 'B5'
  | 'B6'
  | 'B7'
  | 'B8'
  | 'D1'
  | 'D2'
  | 'D3'
  | 'PRACTICE';

export interface GuitarTheoryNote {
  id: string; // stable, e.g. 'b7.drop3mute'
  subsectionPrefix: GuitarSubsectionPrefix | readonly GuitarSubsectionPrefix[];
  placement: 'intro' | 'info' | 'popover'; // intro = step info panel (auto-open once); info = (i) drawer; popover = ChordBox/chip popover
  kind: 'theory' | 'technique' | 'listening' | 'practice';
  when: TheoryNoteCondition; // predicate id, section 2.8
  title: string; // ≤ 5 words
  body: string; // 1–4 sentences, ≤ 20 words each; {tokens} resolved per key/step
}
```

#### 2.3 Chord formulas and label rules

`CHORD_FORMULA` (semitones → label, role):

| Quality | Formula line | Tones          | Quality tones (for diagnostics) |
| ------- | ------------ | -------------- | ------------------------------- |
| maj     | `R 3 5`      | 0 R, 4 3, 7 5  | third                           |
| min     | `R ♭3 5`     | 0 R, 3 ♭3, 7 5 | third                           |
| maj7    | `R 3 5 7`    | + 11 7         | third, seventh                  |
| dom7    | `R 3 5 ♭7`   | + 10 ♭7        | third, seventh                  |
| min7    | `R ♭3 5 ♭7`  | 0, 3, 7, 10    | third, seventh                  |
| min7b5  | `R ♭3 ♭5 ♭7` | 0, 3, 6, 10    | third, fifth, seventh           |

Rules:

- `chordToneLabel(midi, rootPc, q)` = `CHORD_FORMULA[q][(midi − rootPc) mod 12]`. A missing entry means the shape isn't the labelled chord, so the integrity test fails.
- Dot labels use **R**, never "1", so they can't be confused with finger 1. Key numbers use 1–7 in a chip style, and chord-tone mode shows a legend. ChordBox offers only Fingers | Chord tones. Fretboard, ScaleBox and TAB offer the modes that fit the step type (section 3).
- `spellChordTones(rootName, q)` stacks letters: root letter, then +2, +4 and +6 letters. Each accidental is whatever makes the target semitone. Examples: Gb → Bb, Db; E#m7♭5 → G#, B, D#; C#7 → E#, G#, B. The root name comes from `chordRootName(center, degree)`. There is never a fixed sharps table.
- The spoken aria for each label: `R` → "root", `b3` → "flat 3", `b5` → "flat 5", `b7` → "flat 7".

#### 2.4 Voicing-family classifier

```ts
const STACK: Record<ChordToneLabel, 0 | 1 | 2 | 3> = {
  R: 0,
  '3': 1,
  b3: 1,
  '5': 2,
  b5: 2,
  '7': 3,
  b7: 3,
};
export function dropFamily(lowToHigh: ChordToneLabel[]) {
  if (lowToHigh.length !== 4) return null;
  const idx = lowToHigh.map((t) => STACK[t]);
  if (new Set(idx).size !== 4) return null;
  const top = idx[3];
  const voice = new Map<number, number>(); // close position, counted down from the top voice
  for (let k = 0; k < 4; k++) voice.set((top - k + 4) % 4, k + 1);
  const sig = [...idx]
    .reverse()
    .map((i) => voice.get(i))
    .join('');
  return (
    (
      {
        '1234': 'close',
        '1342': 'drop2',
        '1243': 'drop3',
        '1324': 'drop2and4',
        '1423': 'drop2and3',
      } as const
    )[sig] ?? null
  );
}
```

`classifyVoicing(shape, rootPc, quality)`:

1. Take the notes low → high from `shapeNotes`, then label each tone (2.3). If any tone is unlabelled, return `unclassified`.
2. For triad qualities, test in this order:
   - any open string → `open-chord`
   - 6 strings played → `root6-full-barre`
   - otherwise, by lowest string: 6 → `root6-four-string`, 5 → `root5-four-string`, 4 → `root4-four-string`.
3. For seventh qualities:
   - 4 notes and 4 distinct tones → `dropFamily(toneOrder)`
   - otherwise, any open string → `open-string-seventh`
   - otherwise → `unclassified`.

Why the two book grips are what they are:

- **Cmaj7 `X-3-5-4-5-X`.** Close position G-B-C-E. Drop the 2nd voice from the top (C) an octave and you get C-G-B-E. That is **drop 2**.
- **Gmaj7 `3-X-4-4-3-X`.** Close position F#-G-B-D. Drop the 3rd voice from the top (G) and you get G-F#-B-D. That is **drop 3**.

**Classification of every Book One shape type (planned corrections applied):**

| Family (UI tag)                                      | Tones low → high                                                                                                      | Strings           | Book One shapes                                                                                                                                                                            | Page entries    | Map bars |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------- | -------- |
| `open-chord` ("Open chord")                          | C R-3-5-R-3 · A R-5-R-3-5 · Am R-5-R-♭3-5 · D R-5-R-3 · Dm R-5-R-♭3 · E R-5-R-3-5-R · Em R-5-R-♭3-5-R · G R-3-5-R-3-R | open              | `X-3-2-0-1-0`, `X-0-2-2-2-0`, `X-0-2-2-1-0`, `X-X-0-2-3-2`, `X-X-0-2-3-1`, `0-2-2-1-0-0`, `0-2-2-0-0-0`, `3-2-0-0-0-3`                                                                     | 24              | 29       |
| `root5-four-string` ("Root on string 5")             | R-5-R-3 / R-5-R-♭3                                                                                                    | 5-4-3-2           | major `X-r-r+2-r+2-r+2-X` (B `X-2-4-4-4-X`); minor `X-r-r+2-r+2-r+1-X` (Bm `X-2-4-4-3-X`)                                                                                                  | 30              | 29       |
| `root6-four-string` ("Root on string 6")             | R-5-R-3 / R-5-R-♭3                                                                                                    | 6-5-4-3           | major `r-r+2-r+2-r+1-X-X` (F# `2-4-4-3-X-X`); minor `r-r+2-r+2-r-X-X` (F#m `2-4-4-2-X-X`)                                                                                                  | 13              | 15       |
| `root6-full-barre` ("Root on string 6 · full barre") | R-5-R-3-5-R / ♭3                                                                                                      | 6-1               | F `1-3-3-2-1-1`, Gm `3-5-5-3-3-3`                                                                                                                                                          | 4               | 3        |
| `root4-four-string` ("Root on string 4")             | R-3-5-R                                                                                                               | 4-3-2-1           | F `X-X-3-2-1-1`                                                                                                                                                                            | 1               | 1        |
| `drop2`, root 5 ("Root on string 5 · drop 2")        | R-5-7-3 (maj7) · R-5-♭7-3 (dom7) · R-5-♭7-♭3 (min7) · R-♭5-♭7-♭3 (min7♭5)                                             | 5-4-3-2           | relative frets: maj7 `X-0-2-1-2-X`, dom7 `X-0-2-0-2-X`, min7 `X-0-2-0-1-X`, min7♭5 `X-0-1-0-1-X` (Cmaj7 `X-3-5-4-5-X`, Dm7 `X-5-7-5-6-X`, G7 `X-10-12-10-12-X`, Bm7♭5 `X-14-15-14-15-X`)   | 67 (24/8/24/11) | 53       |
| `drop2`, root 4 ("Root on string 4 · drop 2")        | R-5-7-3                                                                                                               | 4-3-2-1           | Dmaj7 `X-X-0-2-2-2` (A Example 5, bar 4 only; open D root)                                                                                                                                 | 0               | 1        |
| `drop3`, root 6 ("Root on string 6 · drop 3")        | R-7-3-5 · R-♭7-3-5 · R-♭7-♭3-5 · R-♭7-♭3-♭5                                                                           | 6-(5 muted)-4-3-2 | relative frets: maj7 `0-X-1-1-0-X`, dom7 `0-X-0-1-0-X`, min7 `0-X-0-0-0-X`, min7♭5 `0-X-0-0-(-1)-X` (Gmaj7 `3-X-4-4-3-X`, Am7 `5-X-5-5-5-X`, D7 `10-X-10-11-10-X`, Dm7♭5 `10-X-10-10-9-X`) | 27 (10/4/12/1)  | 25       |
| `open-string-seventh` ("Open-string voicing")        | Emaj7 R-5-7-3-5-R · Fmaj7 R-3-7-3-5-7                                                                                 | 6-1               | `0-2-1-1-0-0`, `1-0-2-2-1-0`                                                                                                                                                               | 2               | 0        |

Notes:

- Emaj7's lower four strings happen to form a drop-2 pattern. Its doubled 5 and R on top make it an open voicing.
- Every movable triad contains a close three-note triad on three neighbouring strings, for example 5-R-3 on strings 4-3-2 of the root-5 shapes, with the other notes doubled around it. That is the hook for a future "small triad inside" feature.
- `FAMILY_TEMPLATES` holds the relative-fret rows above.
  - Every movable Book One shape matches exactly one template: 94 of 96 sevenths and 48 of 48 movable triads.
  - `compareShapes(rootString, rootFret)` builds the four-quality panel from the drop-2 or drop-3 template at the current chord's root.
  - A root fret of 0 is shifted up 12. A min7♭5 drop-3 shape needs a root fret of at least 1.
  - The panel is captioned as a comparison and is never graded.

#### 2.5 Key-level derivations

- `DIATONIC_TRIADS = ['maj','min','min','maj','maj','min','dim']` and `DIATONIC_SEVENTHS = ['maj7','min7','min7','maj7','dom7','min7','min7b5']`. The Section B strip shows 1–7. Triad 7 is greyed with "later as 7 min7(♭5)".
- `FUNCTION_OF_DEGREE = {1:'home', 3:'home', 6:'home', 2:'away', 4:'away', 5:'tension', 7:'tension'}`.
- `relativeMinor(center) = center.scaleNotes[5]`.
- `keyChange(prev, cur)` returns the removed and added pitch class, each spelled in its own key, plus `respelled` (true only for F# → Db).

  | Key | Change from previous key | Relative minor |
  | --- | ------------------------ | -------------- |
  | C   | none                     | A              |
  | G   | F → F#                   | E              |
  | D   | C → C#                   | B              |
  | A   | G → G#                   | F#             |
  | E   | D → D#                   | C#             |
  | B   | A → A#                   | G#             |
  | F#  | E → E#                   | D#             |
  | Db  | B → C, respelled         | Bb             |
  | Ab  | Gb → G                   | F              |
  | Eb  | Db → D                   | C              |
  | Bb  | Ab → A                   | G              |
  | F   | Eb → E                   | D              |

- `romanNumeral(degree, q)` uses uppercase for maj/maj7/dom7 and lowercase for min/min7/min7b5/dim. Suffixes: maj7 → `maj7`, dom7 and min7 → `7`, min7b5 → `ø7`, dim → `°`. Book One gives:
  - triads: I ii iii IV V vi
  - sevenths: Imaj7 ii7 iii7 IVmaj7 V7 vi7 viiø7
- `chordAliases(root, q)` (display only):
  - maj: `Cmaj`, `CM`
  - min: `Dmin`, `D−`
  - maj7: `CM7`, `CΔ7`, `CΔ`
  - min7: `Dmin7`, `D−7`
  - min7b5: `Bø7`, `Bø`, `B−7♭5`, `Bmin7(♭5)`
  - dom7 has no aliases. It uses the `aliases.dom7` string instead.
- `hiddenTriad(degree)` returns the triad on degree + 2, as used by `b7.hidden`:
  - 1 maj7 → 3 min
  - 2 min7 → 4 maj
  - 3 min7 → 5 maj
  - 4 maj7 → 6 min
  - 6 min7 → 1 maj
  - 7 min7♭5 → 2 min
  - 5 dom7 is excluded, because its hidden triad is diminished and not taught.

#### 2.6 Scale derivations (A1, A4)

- **Major scale positions.** All 12 Book One major-scale positions put the root on string 6, with 2-3-3 notes on strings 6-5-4.
  - The half steps always fall on string 5 (3→4) and string 4 (7→8).
  - The octave is string 6 fret r → string 4 fret r+2.
- **Pentatonic positions.** All 12 pentatonic positions put the root on string 3, with 2-2-2 notes on strings 3-2-1.
  - The octave is string 3 fret r → string 1 fret r+3. It crosses the G–B major third.
- `stepSizes(playOrder)` gives midi difference 2 → `W` and 1 → `H`. On A1 steps the chips sit between TAB notes, shown by a "Show steps" toggle. The two `H` moves also get a bracket on the fretboard (shape cue, not colour).
- `octavePairs(position)` returns the two tonic dots. Both get the root marker and a hairline connector labelled "octave".
- `suggestedFingers(position)` sets `anchor` to 1 if the position uses an open string, otherwise to the lowest fretted fret. Finger = fret − anchor + 1, and open strings get none. The result is 1–4 for all 24 positions. A printed book fingering, if one is added later, overrides it. Examples:
  - C scale: finger 1 on fret 7.
  - F scale: frets 1-2-3 → fingers 1-2-3, plus open strings.
  - G pentatonic: frets 2-3 → fingers 2-3.
  - A pentatonic: frets 2-4-5 → fingers 1-3-4.
- `pentatonicGhosts(center, position)` returns positions on strings 3-1, inside `fretStart..fretEnd`, whose pitch class is degree 4 or 7. They're drawn as hollow dashed outlines labelled "not in the pentatonic".

#### 2.7 Music Map analysis (loop-aware: each map plays twice)

Rules (n = bars):

- **Pattern chips:**
  - `two-five-one` wherever degrees 2, 5, 1 appear in a row (mod n, n ≥ 3). It is flagged `wrapsRepeat` when it crosses the repeat.
  - `turnaround-1625` only when n = 4 and degrees are exactly 1, 6, 2, 5 from bar 1.
  - `five-to-one` for a 5 followed by a 1 that isn't already inside a 2-5-1.
- **Change facts.** Each change i → (i+1) mod n records:
  - `sharedPitchClasses`
  - `anchors`: the same string, fret and finger in both shapes. This uses `pageShapeFor(bar)` fingering. Anchors are suppressed when both bars hold the same chord.
  - `sameFretRootMove`: the lowest strings are 6 → 5 (or 5 → 6) at the same fret, with fret > 0
  - `isTricky` when no notes are shared.
- **Other flags:**
  - `dom7ToOne`: 5 dom7 followed by 1.
  - `startsOnSix`: the degree of bar 1 is 6.
  - `triadBarsIn7thMap`: maj/min bars in Examples 4–5.
- **B8 helpers:**
  - `topLineRuns`: 3 or more consecutive chords in the 1–7-then-1 sequence with the same family, whose top-string pitch rises by 1–2 semitones each step.
  - `octaveReturnKind` is `same-shape` when the last shape is the first plus 12 frets, `new-shape` when its root is higher, and `not-higher` otherwise.

Expected Book One results (these become test fixtures):

| Fact                               | Maps                                                                                                                                                                                                                    |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2-5-1                              | A Ex5 bars 1–3 (triads); F# Ex4 bars 2–4; G Ex4 bars 3–4 → 1 (wraps)                                                                                                                                                    |
| Turnaround 1-6-2-5                 | G Ex4                                                                                                                                                                                                                   |
| 5 → 1 (standalone)                 | C Ex4 bars 2–3; B Ex3 bars 1–2; Ab Ex5 bars 2–3; D Ex3 bar 2 → 1 (wraps)                                                                                                                                                |
| 5 dom7 → 1 ("why 5 pulls to 1")    | C Ex4 (G7 → Cmaj7: F→E, B→C); F# Ex4 (C#7 → F#maj7: B→A#, E#→F#); G Ex4 (D7 → Gmaj7, wraps)                                                                                                                             |
| Starts on 6                        | C Ex5, E Ex3, F# Ex4, Ab Ex5, Bb Ex3, F Ex3                                                                                                                                                                             |
| Contains chord 7                   | Bb Ex4                                                                                                                                                                                                                  |
| Triad bars in 7th maps             | D Ex4 (1–3), A Ex5 (1–3), E Ex4 (1–3), B Ex4 (all), Ab Ex4 (1), Ab Ex5 (2), Eb Ex5 (4), F Ex4 (3)                                                                                                                       |
| Same fret, string 6 → 5 (fret > 0) | G Ex2 1→4, G Ex4 2→5, B Ex3 5→1, F# Ex2 1→4, F# Ex4 2→5, Ab Ex2 1→4, Ab Ex5 1→4, Eb Ex3 6→2 (wraps), Bb Ex2 1→4, F Ex2 1→4                                                                                              |
| Tricky (0 shared notes)            | C Ex3 C↔Dm; D Ex4 A→Bm and Gmaj7→A (wraps); E Ex4 E→F#m and A→G#m7; B Ex4 D#m→C#m and F#→G#m; Db Ex3 Ebm↔Db; Ab Ex4 Eb→Dbmaj7                                                                                         |
| Anchors (same string/fret/finger)  | C Ex2 C↔F (string 2 fret 1, finger 1); C Ex5 Am7→Cmaj7 (string 4 fret 5, finger 3); B Ex5 D#m7→Bmaj7 (string 2 fret 7, string 4 fret 8); F# Ex5 G#m7→Bmaj7 (string 4 fret 4); F Ex3 Dm↔Bb (string 2 fret 3, finger 3) |
| B8 top-line runs                   | C, D, B, Bb all 8 chords; G and F# 1–5 and 6–8; A and Ab 3–8; E 2–4 and 5–8; Db 3–5 and 6–8; Eb 1–3 and 4–8; F 4–8                                                                                                      |
| B8 octave return                   | same shape +12: C, D, B, Bb · new shape, higher: G, A, E, F#, Ab, F · not higher: Db, Eb (logged erratum)                                                                                                               |

The fixtures use map fret data after the planned Db Ex1–3 and Eb Ex3 corrections.

#### 2.8 Theory notes: conditions and tokens

`resolveTheoryNote(note, ctx)` works in three steps:

- **Filter:** by `subsectionPrefix` (the prefix of the step id, e.g. `B5.2` → `B5`) and by `when`.
- **Fill:** replaces `{tokens}` from `ctx = { center, step, shape?, voicing?, map?, analysis?, change?, settings }`.
- **Spell:** every note name comes from key-aware spelling.

Conditions (`TheoryNoteCondition`):

- **Key and step:** `always`, `isFirstKey`, `notFirstKeyNoRespell`, `isFlatSwitch` (Db), `scaleHasOpenStrings` (F major scale), `inTimeStep`, `staccatoStep`, `legatoStep`, `romanSettingOn`.
- **Shape:**
  - `firstBarreStepInKey`: the step's shapes include `barre !== 'none'`, and no earlier step in this key did.
  - `shapeHasDoubledTones`, `shapeHasMutedStrings`, `shapeIsMovable`.
  - `familyDrop2`, `familyDrop3`, `familyOpenSeventh`.
  - `firstDrop3StepInKey`.
  - `degreeIsNot5`, `degreeIs7`.
- **Change:** `changeHasAnchor`, `changeSharesNoNotes`, `changeIsSameFretR6toR5`.
- **Map:** `mapHasFiveToOne`, `mapHasTwoFiveOne`, `twoFiveOneWraps`, `mapHasTurnaround`, `mapStartsOnSix`, `mapHasSevenChord`, `mapHasTriadBarIn7thMap`, `mapHasDom7ToOne`.
- **B8:** `hasTopLineRun`, `octaveIsSameShape`, `octaveIsNewShape`, `octaveNotHigher`.

Tokens:

- **Key:** `{key}`, `{prevKey}`, `{oldNote}`, `{newNote}`, `{tonic}`, `{relMinor}`, `{startFret}`.
- **Chord and shape:**
  - `{chord}` (full name) and `{hiddenTriad}` (e.g. "E minor"), `{hiddenDegree}`.
  - `{toneOrder}` ("R, 5, 7, 3").
  - `{stringCount}`, `{noteNames}`, `{rootString}`.
  - `{openStringRoles}` (e.g. "Open A is the 3. Open high E is the 7.").
- **Map:** `{fromDegree}`, `{toDegree}`, `{dom7Chord}`, `{seventhNote}`, `{tonicThird}`, `{thirdNote}`.
- **UI:** `{aliases}`, `{symbol}`, `{n}`, `{chordA}`, `{chordB}`, `{tempo}`, `{from}`, `{to}`, `{done}`, `{tone}`, `{note}`, `{string}`.

String names are `6 low E, 5 A, 4 D, 3 G, 2 B, 1 high E`.

### 3. Where each piece shows in the UI

| Surface                                                          | V1 content                                                                                                                                                                                                                                                                                                                           | Default                                                                                     |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| **Key picker tile detail and lesson header ("About this key")**  | `key.*` notes; chord-family strip preview                                                                                                                                                                                                                                                                                            | Collapsed; "About this key" link                                                            |
| **Step info panel** (guitar branch of the step description area) | `intro` notes open one per step, in list order, starting at the subsection's first step. After that, each collapses to a "Why?" link. `info` notes sit in the (i) drawer, most relevant first.                                                                                                                                       | One note at a time; dismiss is remembered per device                                        |
| **ChordBox header**                                              | Chord name + Hybrid label (existing)                                                                                                                                                                                                                                                                                                 | Always                                                                                      |
| **ChordBox subtitle, line 1**                                    | Formula line (`R 3 5 ♭7`), plus "half-diminished (ø)" on chord 7                                                                                                                                                                                                                                                                     | Always, small type                                                                          |
| **ChordBox subtitle, line 2**                                    | Family tag (section 2.4 UI tags) · Movable or Uses open strings badge                                                                                                                                                                                                                                                                | Always                                                                                      |
| **ChordBox (i) popover**                                         | Aliases; family explainer (`b7.drop2`/`b7.drop3`/`b7.open`/`b7.movable`); `b7.hidden`; tone order (`b1.order`/`b7.order`); open-string roles                                                                                                                                                                                         | On tap                                                                                      |
| **ChordBox dots**                                                | Label mode: Fingers (book) or Chord tones. Root marker shape in both. Quality tones (3rd, 7th) get a thin inner ring in chord-tone mode. The diagnostic ring and X-marker ring come from section 5. The anchor pin is a small lock glyph on dots shared with the next chord, shown on the "next chord" preview during the last beat. | Fingers                                                                                     |
| **ChordBox frame**                                               | Start-fret number when `diagramStartFret > 1`, plus hollow, lighter inlay markers (3, 5, 7, 9, 12, 15). They are mirrored in left-handed mode, and the text is not mirrored.                                                                                                                                                         | On                                                                                          |
| **Fretboard / ScaleBox**                                         | Label toggle: scale and melody steps get Fingers, Notes or Key numbers. Chord and arpeggio steps get Fingers, Notes or Chord tones. Other layers: octave connector (A1, A4), ghost 4/7 outlines (A4), H-step brackets (A1, with "Show steps"), position label (`position.label`)                                                     | Scale steps: Fingers (suggested); chord steps: Fingers                                      |
| **TAB** (`LearnTabView`)                                         | W/H chips between A1 notes ("Show steps"); chord-tone annotation under each arpeggio note (B1/B5/B7) when Chord tones mode is on                                                                                                                                                                                                     | Off                                                                                         |
| **Section B entry card**                                         | `b.fromScale` with a "skip one, take one" highlight on the A1 position (a static frame-by-frame highlight under `prefers-reduced-motion`); chord-family strip (1–7 chips); `b.pattern`, `b.sevenLater`                                                                                                                               | Shown once per key                                                                          |
| **B7 intro**                                                     | `b7.plusOne`; "Why these shapes?" (`b7.why`) collapsed; plus-tier "Same root, four kinds" compare panel with "Hear it" per shape and the moved dot labelled `7 → ♭7`, `3 → ♭3`, `5 → ♭5`                                                                                                                                             | Collapsed                                                                                   |
| **Music Map header and chord strip**                             | Pattern chips (`2-5-1`, `Turnaround`, `5 → 1`) under the bars they span; popovers `d3.*`; aliases and Roman numeral in the chord tooltip; function badges (icon + word: house = Home, arrow = Away, spring = Tension) above bars; shared-note badge between cells                                                                    | Chips on; badges off (`Show chord jobs`); Roman off (teacher setting `Show Roman numerals`) |
| **Practice tools** (tempo bar, loop chip)                        | Ladder rule with a clean-pass tooltip; step-back line; loop presets; tricky-change suggestion; break chip                                                                                                                                                                                                                            | Section 4                                                                                   |
| **Result modal / ChordBox overlay**                              | One diagnostic hint (section 5)                                                                                                                                                                                                                                                                                                      | After a missed or unclear take                                                              |
| **Settings (instrument store, per device)**                      | Label mode per surface, `showSteps`, `showChordJobs`, `showRomanNumerals`, `showSharedNotes`, dismissed-note ids                                                                                                                                                                                                                     | As above. A future low-stimulation preset turns all chips and badges off.                   |

Accessibility:

- ChordBox aria uses `aria.chordbox`, e.g. "C major 7: x 3 5 4 5 x. Low to high: root, 5, 7, 3. Root on string 5, drop 2."
- W/H chips read "whole step" or "half step".
- Function badges and chips carry text, never colour only.

### 4. Practice-tool defaults (P6b)

```ts
export const SPEED_LADDER_DEFAULTS = {
  startPct: 70,
  stepPct: 5,
  targetPct: 100, // plan values, unchanged
  cleanPassesToStepUp: 2,
  stepBackAfterNonClean: 3,
  stepBackPct: 5, // new: never below startPct; shows pt.stepBack
} as const;
export const CLEAN_PASS = {
  // a silently scored practice pass counts as clean when:
  meetsStepPassMark: true, // 75% out of time / 60% in time (plan)
  maxMissedTargets: 1,
  maxUnclearRatio: 0.1,
  minPitchSubScore: 0.85,
} as const;
export const LOOP_PRESETS = [
  'whole-pass',
  'first-half',
  'second-half',
  'tricky-change',
] as const;
export const HAND_CARE = {
  barreLoopMinutes: 10,
  oncePerSession: true,
} as const;
```

- **Loop presets:**
  - `whole-pass` is the default loop on Music Maps: one pass of the map, since the step plays it twice.
  - Halves are bars 1–2 and 3–4 of four-bar maps.
  - `tricky-change` appears when the step contains a change with 0 shared notes. It loops the two bars around that change, including the bar-4 → bar-5 change across the repeat, at `startPct`. Its label is `pt.tricky`.
- **Ladder rule text** is the plan's string with a (i) that opens `pt.clean`.
- **Hand care.**
  - `b.barreCare` shows once per key, on the first step whose shapes have a barre.
  - `pt.break` appears after 10 minutes of cumulative practice looping on barre steps in one session. It is dismissible, with no timer UI and no nagging.
- `pt.focus` sits in the Practice tools (i) drawer. It is not auto-shown.

### 5. Detection and scoring rules (P6 chord-tone diagnostics)

Inputs:

- the target `ChordTarget` (pitch classes, root, quality, shape and `VoicingInfo`)
- the detector label L, with `pcs(L)` taken from `CHORDS`
- `getLastChroma()` (c)
- optionally, a bass estimate

Studio code is unchanged. The rules run in order, and the first match wins.

| #   | Condition                                                                                                                                                                                                                                                                             | Status                                                                                                                                                                                                                     | Hint (one only)                                                                                                                                                                                                                                                             |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | `pcs(L)` equals the target set. This covers the twins Am7 = C6, Dm7 = F6, Em7 = G6 and Bm7♭5 = Dm6, and any label naming the same notes.                                                                                                                                              | hit                                                                                                                                                                                                                        | none                                                                                                                                                                                                                                                                        |
| D2  | 7th target; L has the same root and `pcs(L)` is a proper subset with 3 or more tones. This is the **parsimony case**, e.g. Cmaj7 reported as C.                                                                                                                                       | Check the chroma at each missing tone: `c[pc] ≥ 0.35 × median(c[other chord tones])` → hit. A tone clearly absent → `wrong`, with `det.missing7` (product owner may relax this to a pass). Low overall energy → `unclear`. | `det.missing7` names the string: drop voicings hold each tone on exactly one string                                                                                                                                                                                         |
| D3  | Rootless. For a 7th target, `pcs(L)` equals the target minus its root: Em for Cmaj7, C for Am7, B° for G7, Dm for Bm7♭5. For a triad target, L shares 2 tones, lacks the root, and L's third tone is weak in the chroma (below the D2 threshold). If that tone is strong, D6 applies. | unclear                                                                                                                                                                                                                    | `det.missingRoot` with `{string}` = `voicing.rootString`                                                                                                                                                                                                                    |
| D4  | Same root and L is `'5'`, `sus2` or `sus4`, or the chroma shows R and 5 but the 3rd is below threshold                                                                                                                                                                                | unclear                                                                                                                                                                                                                    | `det.missing3` when R and 5 are both clearly present; otherwise `det.unclearQuality`                                                                                                                                                                                        |
| D5  | An extra pitch class (not in the target) equals the open pitch of one of the shape's X strings. Examples: open A under drop-3 G7 `3-X-3-4-3-X`; open E under Dm7 `X-5-7-5-6-X`. If the X string's note is a chord tone (low E under Cmaj7), the chroma can't show it. Only D7 can.    | Keep the status from the other rules                                                                                                                                                                                       | `det.muteX`, and ring that X marker                                                                                                                                                                                                                                         |
| D6  | Anything else                                                                                                                                                                                                                                                                         | wrong                                                                                                                                                                                                                      | Rank the missing tones: third > seventh > ♭5 (min7♭5 only) > root > fifth. Show the top one. If `doubledTones` is empty (all 7th shapes), use `det.missingToneOneString` and ring one dot. Otherwise use `det.missingToneDoubled` and ring every dot that carries the tone. |
| D7  | Bass check (plus tier). The lowest confident pitch in the 70–200 Hz onset window lies below the shape's lowest note.                                                                                                                                                                  | Never changes the status                                                                                                                                                                                                   | `det.bass`                                                                                                                                                                                                                                                                  |

- All note names in hints come from `spellChordTones`, e.g. "Missing the 7 (E#)" in F#.
- Call `setKeyContext(tonicPc, [0,2,4,5,7,9,11])` at lesson start. The detector's diatonic boost suits Book One.
- Low strings are the known blind spot, and root-6 drop-3 roots sit on string 6. Expect D3 more often there. It feeds the plan's low-E setup check copy.
- A3 legato steps are picked, and `a3.legato` says so. V1 therefore needs no hammer-on onset change.

### 6. User-facing copy (original wording; all strings passed the copy check)

Theory notes (`GUITAR_THEORY_NOTES`) and UI strings follow. The "where" column is the placement from section 3.

| id                     | prefix                  | where   | shows when               | title                      | body                                                                                                                                                  |
| ---------------------- | ----------------------- | ------- | ------------------------ | -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `key.first`            | KEY                     | intro   | `isFirstKey`             | Start with C               | C major has no sharps or flats. Each key after it changes just one note.                                                                              |
| `key.newNote`          | KEY                     | intro   | `notFirstKeyNoRespell`   | One new note               | {key} major is {prevKey} major with one note changed. {oldNote} becomes {newNote}. Find {newNote} in your scale shape.                                |
| `key.newNoteRespelled` | KEY                     | intro   | `isFlatSwitch`           | One new note               | {key} major sounds like {prevKey} major with one note changed. {oldNote} becomes {newNote}. The other notes keep their sound but take flat names.     |
| `key.flatSwitch`       | KEY                     | info    | `isFlatSwitch`           | Now with flats             | From this key on, notes are written with flats. A flat (♭) means one fret lower.                                                                      |
| `key.circle`           | KEY                     | info    | `always`                 | Why this order?            | Each key starts on note 5 of the key before it. Musicians call this order the circle of fifths.                                                       |
| `key.relMinor`         | KEY                     | info    | `always`                 | Its minor partner          | {relMinor} minor uses the same notes as {key} major. It starts on note 6 instead of note 1.                                                           |
| `a1.steps`             | A1                      | intro   | `always`                 | Whole and half steps       | A whole step is 2 frets. A half step is 1 fret. The major scale has half steps in two places: from 3 to 4, and from 7 to 1.                           |
| `a1.octave`            | A1                      | info    | `always`                 | Two roots                  | The low and high {tonic} are the same note, one octave apart. The high one is two strings over and two frets up.                                      |
| `a1.fingers`           | A1                      | intro   | `always`                 | One finger per fret        | Put finger 1 on fret {startFret}. Each finger then covers the next fret. Keep your hand still and let your fingers reach.                             |
| `a1.fingersOpen`       | A1                      | intro   | `scaleHasOpenStrings`    | Open strings               | Open strings need no finger. Let them ring.                                                                                                           |
| `a1.restless`          | A1                      | info    | `always`                 | The restless notes         | Notes 4 and 7 sound unsettled. 7 leans up to 1. 4 leans down to 3. Listen for this near the top of the scale.                                         |
| `a1.degreeNames`       | A1                      | info    | `always`                 | Names for the numbers      | 1 is the tonic, the home note. 5 is the dominant. 7 is the leading tone, because it leads back to 1.                                                  |
| `a1.ionian`            | A1                      | popover | `always`                 | What is Ionian?            | Ionian is another name for the major scale. Starting the same notes from another note makes a new sound, called a mode. Modes come in Book Two.       |
| `a1.slowFirst`         | A1                      | intro   | `inTimeStep`             | Clean, then fast           | Start slowly. Raise the speed only when every note rings clearly.                                                                                     |
| `a2.home`              | A2                      | intro   | `always`                 | Ending on 1                | These melodies begin and end on 1. Ending on 1 sounds finished.                                                                                       |
| `a2.shape`             | A2                      | info    | `always`                 | Up and back                | The second melody climbs and then walks back down. Listen to the demo, then copy it.                                                                  |
| `a3.staccato`          | A3                      | intro   | `staccatoStep`           | Short notes                | Staccato means short. Pick the note, then relax your finger so the sound stops. Keep the finger touching the string.                                  |
| `a3.legato`            | A3                      | intro   | `legatoStep`             | Smooth notes               | Legato means smooth. Pick each note and let it ring until the next one starts. Leave no gaps between notes.                                           |
| `a4.fingers`           | A4                      | intro   | `always`                 | Same finger idea           | Use one finger per fret here too. The numbers on the dots show which finger to use.                                                                   |
| `a4.what`              | A4                      | intro   | `always`                 | Five notes                 | Pentatonic means five notes. This scale is the major scale without notes 4 and 7. That leaves 1, 2, 3, 5 and 6.                                       |
| `a4.why`               | A4                      | info    | `always`                 | No clashing notes          | Notes 4 and 7 make the half steps. Without them, these five notes rarely clash.                                                                       |
| `a4.ghost`             | A4                      | info    | `always`                 | Missing notes              | Faint outlines show where 4 and 7 would be. The pentatonic skips them.                                                                                |
| `a4.gb`                | A4                      | info    | `always`                 | The G and B strings        | The G and B strings are tuned closer together than the others. Shapes move up one fret when they cross onto the B string.                             |
| `a4.octave`            | A4                      | info    | `always`                 | Root to root               | The high {tonic} is two strings over and three frets up. It is one fret further than in the major scale shape, because of the B string.               |
| `a4.relative`          | A4                      | info    | `always`                 | Did you know?              | These five notes also make the {relMinor} minor pentatonic. Only the home note changes.                                                               |
| `b.fromScale`          | B                       | intro   | `always`                 | Chords come from the scale | Pick a scale note. Skip the next note and take the one after. Do that once more. Those three notes make a triad.                                      |
| `b.pattern`            | B                       | intro   | `always`                 | Same pattern, every key    | In every major key the chords follow one pattern. 1 major, 2 minor, 3 minor, 4 major, 5 major, 6 minor, 7 diminished.                                 |
| `b.sevenLater`         | B                       | info    | `always`                 | Where is chord 7?          | The triad on 7 is diminished. You will play it later as a 7th chord: 7 min7(♭5).                                                                      |
| `b.barreCare`          | B1 B2 B4 B5 B6 B7 B8 D3 | intro   | `firstBarreStepInKey`    | Look after your hand       | Barre shapes need strength. Rest your hand when it feels tired. Stop if anything hurts.                                                               |
| `b1.arp`               | B1 B5                   | intro   | `always`                 | One note at a time         | An arpeggio plays a chord one note at a time. A strum plays the same notes together.                                                                  |
| `b1.order`             | B1 B5                   | popover | `always`                 | Listen low to high         | Low to high, this shape plays {toneOrder}. R is the root.                                                                                             |
| `b1.names`             | B1 B5                   | info    | `shapeHasDoubledTones`   | Three note names           | This shape uses {stringCount} strings but only three note names: {noteNames}. Some notes appear twice, in different octaves.                          |
| `b1.third`             | B1 B5                   | info    | `always`                 | Listen for the 3           | The note marked 3 sets the mood. Major sounds bright. Minor sounds darker.                                                                            |
| `b2.root`              | B2 B4 B6                | intro   | `always`                 | Start on the root          | Start your strum on the string with the root marker.                                                                                                  |
| `b2.x`                 | B2 B4 B6                | info    | `shapeHasMutedStrings`   | Skip the X strings         | An X means do not play that string. Its note would sit under the chord and change its sound.                                                          |
| `b2.anchor`            | B2 B4 B6 B8 D3          | popover | `changeHasAnchor`        | Keep a finger down         | Both chords use this note. Leave that finger pressed and move the others.                                                                             |
| `b2.rhythmFirst`       | B2 B4 B6                | info    | `always`                 | Rhythm first               | New rhythm? Strum it on one chord first. Add the changes when it feels easy.                                                                          |
| `b4.mixed`             | B4                      | intro   | `always`                 | Mixed order                | Mixed order teaches your hand to find each shape quickly. Look at the next chord before the change.                                                   |
| `b3.mute`              | B3                      | intro   | `always`                 | Short chords               | To make a chord short, relax your fretting fingers. Keep them on the strings. The sound stops right away.                                             |
| `b7.plusOne`           | B7 B8                   | intro   | `always`                 | Triad plus one             | A 7th chord is a triad with one more note on top. That note is the 7th.                                                                               |
| `b7.hidden`            | B7 B8                   | popover | `degreeIsNot5`           | A chord inside a chord     | Take away the root of {chord} and {hiddenTriad} is left. You already know it as chord {hiddenDegree}.                                                 |
| `b7.kinds`             | B7 B8                   | info    | `always`                 | Four kinds of 7th chord    | Major 7: R 3 5 7. Dominant 7: R 3 5 ♭7. Minor 7: R ♭3 5 ♭7. Minor 7(♭5): R ♭3 ♭5 ♭7.                                                                  |
| `b7.sound`             | B7 B8                   | info    | `always`                 | How they sound             | Major 7 sounds soft. Dominant 7 sounds bluesy and wants to move. Minor 7 sounds mellow. Minor 7(♭5) sounds tense.                                     |
| `b7.oneNote`           | B7 B8                   | info    | `always`                 | One note apart             | Lower the 7 by one fret and major 7 becomes dominant 7. Then lower the 3 and it becomes minor 7. Then lower the 5 and it becomes minor 7(♭5).         |
| `b7.order`             | B7 B8                   | popover | `always`                 | Spread-out notes           | Low to high, this shape plays {toneOrder}. The notes are spread out, but it is still the same chord.                                                  |
| `b7.why`               | B7 B8                   | info    | `always`                 | Why these shapes?          | Four notes packed close together are hard to finger on guitar. Moving one note down an octave spreads them out. Then each finger gets its own string. |
| `b7.drop2`             | B7 B8                   | popover | `familyDrop2`            | Drop 2 shape               | Root on string {rootString}, then one note on each string. Guitarists call this a drop 2 shape.                                                       |
| `b7.drop3`             | B7 B8                   | popover | `familyDrop3`            | Drop 3 shape               | Root on string 6, then skip string 5. Guitarists call this a drop 3 shape.                                                                            |
| `b7.drop3mute`         | B7 B8                   | intro   | `firstDrop3StepInKey`    | Keep string 5 quiet        | String 5 must not sound. Let the finger on string 6 lean lightly against it.                                                                          |
| `b7.halfDim`           | B7 B8                   | popover | `degreeIs7`              | Half-diminished            | Chord 7 is minor 7(♭5). Many charts call it half-diminished and write ø.                                                                              |
| `b7.movable`           | B7 B8                   | popover | `shapeIsMovable`         | Movable shape              | This shape has no open strings. Slide it along the neck and it keeps its type. The root note gives it its name.                                       |
| `b7.open`              | B7 B8                   | popover | `familyOpenSeventh`      | Open strings count         | The open strings are part of this chord. {openStringRoles} Let them ring.                                                                             |
| `b8.topNote`           | B8                      | info    | `hasTopLineRun`          | Listen to the top          | Listen to the highest string. While the shape stays the same, it climbs one scale step per chord.                                                     |
| `b8.octaveSame`        | B8                      | info    | `octaveIsSameShape`      | Back to 1                  | Chord 1 returns 12 frets higher. Same shape, one octave up.                                                                                           |
| `b8.octaveNew`         | B8                      | info    | `octaveIsNewShape`       | Back to 1                  | Chord 1 returns higher up the neck, with a different shape. It is still the same chord.                                                               |
| `b8.octaveEnd`         | B8                      | info    | `octaveNotHigher`        | Back to 1                  | Chord 1 comes back to finish the set.                                                                                                                 |
| `d.listenFirst`        | D1 D2 D3                | intro   | `always`                 | Listen first               | Listen to the demo once before you play. Knowing the sound makes the changes easier to find.                                                          |
| `d3.jobs`              | D3                      | info    | `always`                 | Chord jobs                 | Home chords (1, 3, 6) feel settled. Away chords (2, 4) move away from home. Tension chords (5, 7) pull back home.                                     |
| `d3.fiveOne`           | D3                      | popover | `mapHasFiveToOne`        | 5 to 1                     | The 5 chord builds tension. The 1 chord releases it. This is the strongest way to arrive home.                                                        |
| `d3.twoFiveOne`        | D3                      | popover | `mapHasTwoFiveOne`       | 2-5-1                      | The 2 chord leads to the 5 chord. The 5 chord leads home to 1. You will hear this move in many songs.                                                 |
| `d3.twoFiveOneWrap`    | D3                      | popover | `twoFiveOneWraps`        | 2-5-1                      | Here the 2-5-1 happens across the repeat. The map lands on 1 when it starts again.                                                                    |
| `d3.turnaround`        | D3                      | popover | `mapHasTurnaround`       | Turnaround                 | 1, 6, 2, 5 leads back to 1. That is why this map loops so smoothly.                                                                                   |
| `d3.six`               | D3                      | info    | `mapStartsOnSix`         | Starting on 6              | This map starts on chord 6, the relative minor. The notes are the same, but the mood is darker.                                                       |
| `d3.seven`             | D3                      | popover | `mapHasSevenChord`       | Chord 7                    | Chord 7 shares three notes with the 5 dom7 chord. So it has a similar pull toward 1.                                                                  |
| `d3.triadBar`          | D3                      | popover | `mapHasTriadBarIn7thMap` | A triad in a 7th map       | This bar uses a triad. A triad and a 7th chord on the same number do the same job. The 7th only adds colour.                                          |
| `d3.sameFret`          | D3                      | popover | `changeIsSameFretR6toR5` | Same fret, next string     | The root moves from string 6 to string 5 on the same fret. That lifts the root by a 4th. Here it takes you from {fromDegree} to {toDegree}.           |
| `d3.pull`              | D3                      | info    | `mapHasDom7ToOne`        | Why 5 pulls to 1           | In {dom7Chord}, {seventhNote} wants to step down to {tonicThird}. {thirdNote} wants to step up to {tonic}. Those small steps make 1 sound like home.  |
| `d3.tricky`            | B2 B4 B6 B8 D3          | popover | `changeSharesNoNotes`    | Tricky change              | These chords share no notes, so every finger moves. Loop this change a few extra times.                                                               |
| `d3.roman`             | D3                      | info    | `romanSettingOn`         | Roman numerals             | Many classes write chords as Roman numerals. Capital letters mean major. Small letters mean minor. 2 min7 is written ii7.                             |
| `d3.jam`               | D3                      | info    | `always`                 | Make it your own           | Loop this map and play the pentatonic scale over it. Try ending each idea on a note from the current chord.                                           |
| `pt.focus`             | PRACTICE                | info    | `always`                 | One thing at a time        | Choose one thing to practise today. Short, focused practice works better than long, scattered practice.                                               |
| `pt.clean`             | PRACTICE                | popover | `always`                 | Clean pass                 | A clean pass misses no more than one note. Almost every note must be heard clearly.                                                                   |

| id                         | text                                                                                                             |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `toggle.fingers`           | Fingers                                                                                                          |
| `toggle.notes`             | Notes                                                                                                            |
| `toggle.chordTones`        | Chord tones                                                                                                      |
| `toggle.keyNumbers`        | Key numbers                                                                                                      |
| `legend.fingers`           | Numbers show which finger to use. 1 is your index finger.                                                        |
| `legend.chordTones`        | R is the root. 3, 5 and 7 count up from the root. ♭ means one fret lower.                                        |
| `legend.keyNumbers`        | Numbers show each note's place in the key. 1 is home.                                                            |
| `legend.steps`             | W is a whole step (2 frets). H is a half step (1 fret).                                                          |
| `family.open`              | Open chord                                                                                                       |
| `family.r6`                | Root on string 6                                                                                                 |
| `family.r5`                | Root on string 5                                                                                                 |
| `family.r4`                | Root on string 4                                                                                                 |
| `family.r6full`            | Root on string 6 · full barre                                                                                    |
| `family.drop2`             | Root on string {rootString} · drop 2                                                                             |
| `family.drop3`             | Root on string 6 · drop 3                                                                                        |
| `family.openSeventh`       | Open-string voicing                                                                                              |
| `badge.movable`            | Movable                                                                                                          |
| `badge.openStrings`        | Uses open strings                                                                                                |
| `formula.maj`              | R 3 5                                                                                                            |
| `formula.min`              | R ♭3 5                                                                                                           |
| `formula.maj7`             | R 3 5 7                                                                                                          |
| `formula.dom7`             | R 3 5 ♭7                                                                                                         |
| `formula.min7`             | R ♭3 5 ♭7                                                                                                        |
| `formula.min7b5`           | R ♭3 ♭5 ♭7                                                                                                       |
| `nickname.min7b5`          | half-diminished (ø)                                                                                              |
| `chordbox.minorNote`       | Minor lowers the 3 by one fret.                                                                                  |
| `aliases`                  | Also written as {aliases}. They all mean the same chord.                                                         |
| `aliases.dom7`             | Charts write this chord as {symbol}. A plain 7 means dominant 7.                                                 |
| `fn.home`                  | Home                                                                                                             |
| `fn.away`                  | Away                                                                                                             |
| `fn.tension`               | Tension                                                                                                          |
| `toggle.showJobs`          | Show chord jobs                                                                                                  |
| `toggle.roman`             | Show Roman numerals                                                                                              |
| `chip.251`                 | 2-5-1                                                                                                            |
| `chip.turnaround`          | Turnaround                                                                                                       |
| `chip.fiveOne`             | 5 → 1                                                                                                            |
| `badge.shared`             | {n} shared notes                                                                                                 |
| `badge.sharedNone`         | No shared notes                                                                                                  |
| `octave.label`             | octave                                                                                                           |
| `ghost.label`              | not in the pentatonic                                                                                            |
| `position.label`           | Position {startFret}: finger 1 on fret {startFret}                                                               |
| `compare.title`            | Same root, four kinds                                                                                            |
| `compare.moved`            | {from} → {to}                                                                                                    |
| `compare.caption`          | Shapes built on {root} for comparison.                                                                           |
| `aria.chordbox`            | {chordName}: {shapeSpoken}. Low to high: {toneOrderSpoken}. {familyTag}.                                         |
| `aria.step`                | {interval}: {stepWord}                                                                                           |
| `pt.ladder`                | {from}% → {to}% after {n} clean passes · {done}/{n}                                                              |
| `pt.stepBack`              | Slowing to {tempo}% for a few passes.                                                                            |
| `pt.tricky`                | Tricky change: {chordA} → {chordB}. Loop these two bars at {tempo}%?                                             |
| `pt.loopWholeMap`          | Loop one pass of the map                                                                                         |
| `pt.loopHalf`              | Loop bars {from}–{to}                                                                                            |
| `pt.break`                 | You have worked on barre chords for 10 minutes. Shake out your hand and rest for a minute.                       |
| `det.missing3`             | We heard the root and the 5, but not the 3. The 3 makes a chord major or minor. Check the ringed dot.            |
| `det.missingToneOneString` | Missing the {tone} ({note}). In this shape it is on string {string}. Check that nothing is touching that string. |
| `det.missingToneDoubled`   | Missing the {tone} ({note}). Check the ringed dots.                                                              |
| `det.missing7`             | We heard the chord, but not the 7 ({note}). It is on string {string} in this shape.                              |
| `det.missingRoot`          | The top notes sounded right, but the root was quiet. Press the root firmly and let string {string} ring.         |
| `det.muteX`                | We also heard open string {string}. Mute it, or skip it when you strum.                                          |
| `det.bass`                 | Nice chord! We also heard a low note under it. Start your strum on string {string}.                              |
| `det.unclearQuality`       | We could not tell if this was major or minor. Let string {string} ring clearly.                                  |

### 7. Tests (vitest; `npx tsc -b` green)

| File                                                       | Cases                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/guitar/theory/__tests__/chordTones.test.ts`       | Formula table for the 6 qualities. `shapeToneLabels` for C `X-3-2-0-1-0` → R 3 5 R 3; Dm7 `X-5-7-5-6-X` → R 5 ♭7 ♭3; Gmaj7 `3-X-4-4-3-X` → R 7 3 5; Fmaj7 `1-0-2-2-1-0` → R 3 7 3 5 7. `spellChordTones`: Gb → Bb, Db; E#m7♭5 → G#, B, D#; C#7 → E#, G#, B. No output contains a sharp name in the flat keys Db, Ab, Eb, Bb and F.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `…/voicing.test.ts`                                        | `dropFamily`: one synthetic voicing for each signature in its lookup table, plus a 3-note input (returns null). Every `GUITAR_ATLAS_BOOK_ONE` page shape and map bar classifies to the table in 2.4 (snapshot of counts: 24/30/13/4/1 triads; 67/27/2 sevenths; map-bar counts). Every shape `isRootPosition`. Drop-3 shapes have `skippedStrings` [5]. Only `E/seventh/1` and `F/seventh/1` are `open-string-seventh`. Every movable shape matches exactly one `FAMILY_TEMPLATES` row. `compareShapes(5, 3)` equals the book shapes C key 1, F key 5, Bb key 2 and Db key 7. On the uncorrected fixture, the classifier flags exactly the shape and chord-name errata in `bookOneErrata.ts` (Ab 7th 6, Bb triad 2, Eb triad 6, Db Ex1–3, Eb Ex3, A Ex3, A Ex4 bar 4, E Ex5 bar 2, Ab Ex5 bar 3), and nothing else. |
| `…/keyTheory.test.ts`                                      | `keyChange` table (section 2.5) for all 12 keys, with `respelled` only at Db. Relative minors. Roman numerals for triads 1–6 and sevenths 1–7. Aliases per quality. `hiddenTriad` for degrees 1, 2, 3, 4, 6 and 7, and none for 5.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `…/scaleTheory.test.ts`                                    | For all 12 keys, `stepSizes` = W W H W W W H, and the H moves are on the same string. Octave pairs: string 6 r → string 4 r+2, and string 3 r → string 1 r+3. `suggestedFingers` stays within 1–4 for all 24 positions, with F and G-pentatonic open-position cases. `pentatonicGhosts` are only degree 4/7 pitch classes inside the window. The pentatonic equals the major scale minus {4, 7}.                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `…/mapAnalysis.test.ts`                                    | Every row of the 2.7 fixture table: patterns, wraps, dom7-to-one spelled notes, starts-on-6, chord 7, triad bars, same-fret moves (fret 0 excluded), tricky changes, anchors (none for identical chords), B8 runs and octave-return kinds. There is no 2-5-1 in C Ex4 (4-5-1-2).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `…/diagnostics.test.ts`                                    | D1 twins: Am7 target with C6 label → hit; Bm7♭5 with Dm6 → hit. D2: Cmaj7 target, C label, chroma with B present → hit; B absent → `det.missing7` naming string 3. D3: Cmaj7 target, Em label → unclear + missing root (string 5); Am7 `5-X-5-5-5-X` with C label → string 6. D4: `'5'` label on a C target → unclear. D5: extra A on a drop-3 target → `det.muteX` string 5. D6: ranking chooses the third over the fifth. Spelling in F# (E#). D7 never changes the status.                                                                                                                                                                                                                                                                                                                                       |
| `src/curriculum/data/guitar/__tests__/theoryNotes.test.ts` | Ids are unique. Prefixes are valid. Every `when` has a predicate. Every token resolves for all 12 keys and all applicable steps, with no `{` left after resolution. Style lint: at most 4 sentences and at most 20 words per sentence. A snapshot of resolved notes for C, F# and Db (`key.newNoteRespelled`: "Db major sounds like F# major with one note changed. B becomes C. …").                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Component tests (`ChordBox`, `Fretboard`, `LearnTabView`)  | Formula and family subtitle render. Chord-tone labels are drawn unmirrored in left-handed mode. The inlay markers are hollow, so they can't be mistaken for finger dots. Aria strings match `aria.chordbox`. Toggles persist per device. Badges are off by default.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Practice tools                                             | The clean-pass predicate at its boundaries. Step-back after 3 non-clean passes never goes below 70%. The tricky-change preset spans bars 4–5 for a wrap change. Break chip after 10 minutes of barre looping, once per session.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |

Copy-check guard: `beato_spec/copycheck.py` stays **outside the repo**, because it needs the book text. Re-run it on `theoryNotes.ts` strings before any copy change ships. An optional committed guard could store only SHA-1 hashes of the book's 7-grams (about 21k), so the book text never enters the repo. Whether to do that is the product owner's call.

## Future curriculum

These topics are standard theory unless marked otherwise. Build them later with our own examples. The risk notes come from the readers.

| Later home                          | Topics                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Notes                                                                                                                |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| **Book Two (Modes)**                | Modes of the major scale with characteristic notes (Dorian ♮6, Phrygian ♭2, Lydian #4, Mixolydian ♭7, Aeolian ♭6, Locrian ♭2/♭5). Chord 1–7 ↔ mode teaser line on 7th ChordBoxes. One parent scale over a map, with mode names. Chord-scale choices per chord type. Quartal voicings as modal colour. Mode-ID ear game over a drone. Modal modulation by sharp and flat direction. Melodic minor, harmonic minor and symmetric scales as a formula-only library. Fingering systems (box, three-per-string, extended), generated in code.                                                                                                                                                                                                                                                                            | Medium risk: chord-family/scale tables, the "specificity ladder", the book's fingering diagrams. Use our own layout. |
| **Minor keys**                      | Natural-minor harmony (i ii° III iv v VI VII; sevenths i7 iiø7 …), with a `mode: 'major' \| 'minor'` field on key centers. Minor 2-5-1 maps. The relative-minor "home note" toggle on the pentatonic. Minor pentatonic and blues scales.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Data model hook: allow `mode` and flat or sharp degree prefixes in hybrid labels now                                 |
| **Book Three (Chord Structures)**   | Inversions and slash chords (bass degree, "C/E", `1 maj/3` Hybrid form). Triads on four string sets in three inversions ("small triad inside" hook from 2.4). Drop-2 and drop-3 inversions on other string sets. Drop 2+4 and drop 2+3. Other four-note qualities (dim7, m(maj7), 6, m6, 7sus4, 7♭5, 7#5, maj7#5), with additive detector templates where missing. Sus2/sus4/add9 colour steps. Augmented and dim7 symmetry (repeat every 4 and 3 frets). Upper-structure triads over a bass note. Polychords. Alteration "chord builder". Skipped-string voicings.                                                                                                                                                                                                                                                  | The book's triad-over-bass tables, Q/lyd naming and alteration chart are inspiration only (next section)             |
| **Harmony extensions (later maps)** | Secondary dominants and passing diminished chords (notation such as `6 dom7 → 2`). Tritone substitution and the backdoor ♭VII7. The 12-bar blues map in all keys (`1 dom7` ×4 …) with root-6/root-5 dom7 grips. AABA, rhythm changes and pedal-point maps. Key-centre analysis capstone. "Harmonize the melody". Reharmonization intro (keep the bass/change the quality; keep the quality/move the root; replace the function). "Try a variation" function swaps (1↔6, 1↔3, 4↔2). "Stay close" alternate root-5/root-6 voicings. Guide-tone lines (3rds and 7ths) and voice-leading drills, including the G-string line with a root-6 G7. Chord melody and a harmonized top line.                                                                                                                                | Only our own progressions; never the book's reharmonized tunes or numbered rules                                     |
| **Practice and feature follow-ups** | Interval explorer (fret ruler, our own sound words). Ear games: chord quality, echo the phrase, sing then play (opt-in), name the gap, guess the Map. "Name the numbers" and "Chord detective" quizzes. "Make your own Map" from Home/Away/Tension bins. "Play over the map" jam mode with chord-tone targets and nearest-note hints. Tonic drone, excluded from detector input. Scale in 3rds. Zig-zag and reverse arpeggio chips. Rhythm remix and rhythm cards with count labels. Rhythm-only warm-up. Roots-only lane. Bass + strum pattern. Muted "chuck" marks. Backbeat (2 and 4) metronome after 100%. Cycle-of-fifths chord drill. Shape-walk warm-up. Finger-permutation warm-ups. Pick/p-i-m-a marks. "My chords" tray. Practice planner and log (our own proportions). Hammer-on/pull-off onset support. | Medium: practice-time split. Don't reuse the book's percentages.                                                     |
| **Advanced (late)**                 | Pentatonic per chord and altered pentatonics. Walking bass generator. Altered-dominant practice. Tension resolution computed from pitch distances. Transcription and pitch-memory ear work.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Inspiration-level only                                                                                               |

## Inspiration only (not content)

None of these may be reproduced, paraphrased closely, reordered or used as the basis of app data or exercises. Allowed use: "a tool of this kind could exist". Build it from general theory in our own structure.

1. The numbered substitution-rule system (about 29 rules), with its order, conditions and worked examples.
2. The book's own chord naming: "Lydian"/"Locrian" triads, sus4♭5 labels, the Q / Q+ / +4Q quartal suffixes, fraction-style triad-over-interval labels, "Twelve Tone type", "Bloc", "Dominant Diminished", and its idiosyncratic 7th-family names.
3. The triad-over-bass table (bass/triad → intervals, scales, names), and the rule that triad-over-bass substitutions voice-lead as if the bass were absent.
4. Jazz reharmonization templates: the reharmonized F blues set, the 20-turnaround list, the rhythm-changes and bridge approaches, the reharmonized standards and the common-tone reharmonization lists.
5. The V7 → Imaj7 tension-resolution chart.
6. The systematic chord-tone alteration chart, and the bitonal (triad-over-triad) arpeggio drill pages and extension chart.
7. The written solos, the 32-bar comping sheet, the three bassline comping rhythm patterns, the walking-bass and cycle-of-fifths lines, the pentatonic usage lines and tables, and the ii-V-I substitution table.
8. All fingering diagrams and position-labelling schemes: interval-labelled arpeggio pages, 3-per-string, close-position, 2-per-string and extended fingerings.
9. The chord-family tables with their "characteristics" column.
10. The quoted consonance/dissonance taxonomy (the Persichetti labels).
11. The least-to-most-specific chord-label ladder, and the book's term for a mode's distinguishing note. Use "characteristic note".
12. The Ex. 44 tune analysis and other worked tune analyses.
13. The practice-time percentages.
14. The chord-form page layouts (colour-coded drop-voicing pages, 18-quality grids).

## Copy-check result

**Script.** `/private/tmp/claude-501/-Users-marfizo-Documents-Full-App-Code/d42ea94e-5c24-4a5d-93d6-46fbf1ed87c1/scratchpad/beato_spec/copycheck.py`

**How it compares text.** Both sides are normalised the same way:

- lowercase
- hyphenated line breaks joined
- quotes and dashes unified
- ♭ → b, ♯ → #
- `{tokens}` removed
- punctuation turned into spaces

The book's extracted "ti" ligature (`%`, e.g. `dis%nct`) is restored before comparison.

**What it compares against.** It builds every 7-word window from two extractions of the PDF: `beato.txt` (layout) and `beato_spec/beato_raw.txt` (raw, which catches sentences split across columns).

**Controls.** A sentence taken from the book is flagged (positive control), and a neutral sentence passes.

**Results:**

| Checked                                                                        | Strings | Words  | Shared 7-word runs | Shared 5-word runs | Shared 4-word runs                                                                                                       |
| ------------------------------------------------------------------------------ | ------- | ------ | ------------------ | ------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| All copy (`beato_spec/copy.json`: 72 notes + 60 UI strings, titles and bodies) | 204     | 1,883  | **0**              | 0                  | 6, all generic ("1 2 3 5", "a triad a triad", "b3 5 b7 minor", "begin and end on", "that is why this", "the top of the") |
| This whole spec document (every line)                                          | 575     | 10,247 | **0**              | –                  | –                                                                                                                        |

No copy string needed rewriting. The first whole-document run flagged two technical lines, not prose. One was a TypeScript union listing the degrees 1 to 7 in counting order. The other listed drop-voicing names in the book's chapter order. Both lines were rewritten, and the re-run shows 0. Reader draft copy was not reused verbatim. Where a reader's idea was kept, the string was rewritten to the plain-language style: one idea per sentence, at most 20 words per sentence, at most 4 sentences per note.
