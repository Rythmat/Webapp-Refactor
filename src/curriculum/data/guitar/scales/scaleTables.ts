// ── The rest of Theory: tables ────────────────────────────────────────────
// What each scale outside the diatonic modes is made of, in one place to
// read and edit: its steps, the note that gives it its sound, and the chords
// its drills and Music Maps vamp on. The key centers are built from these
// (index.ts).

import { ALL_MODES } from '@/daw/prism-engine/data/modes';
import { SCALE_LESSONS } from '@/lib/learn/scaleLessons';
import { canonicalModeKey } from '@/lib/modeStepsFallback';
import { GUITAR_THEORY_CATALOG } from '../theoryCatalog';
import type {
  BookChordQuality,
  GuitarExtendedScale,
  GuitarHeptatonicScale,
  GuitarPentatonicScale,
  GuitarScaleFamily,
  ScaleDegree,
} from '../types';

export type HeptatonicFamily = Exclude<
  GuitarScaleFamily,
  'diatonic' | 'pentatonic-blues'
>;

/** Each seven-note family's modes, in degree order (mode 1 is the parent). */
export const FAMILY_MODES: Readonly<
  Record<HeptatonicFamily, readonly GuitarHeptatonicScale[]>
> = {
  'harmonic-minor': familyKeys('harmonic-minor'),
  'melodic-minor': familyKeys('melodic-minor'),
  'harmonic-major': familyKeys('harmonic-major'),
  'double-harmonic': familyKeys('double-harmonic'),
};

function familyKeys(family: HeptatonicFamily): GuitarHeptatonicScale[] {
  return GUITAR_THEORY_CATALOG.filter((e) => e.family === family).map(
    (e) => e.key as GuitarHeptatonicScale,
  );
}

export function isPentatonicScale(
  key: GuitarExtendedScale,
): key is GuitarPentatonicScale {
  return key in SCALE_LESSONS;
}

/** Semitones above the tonic, as Learn's piano lessons play them. */
export function scaleSteps(key: GuitarExtendedScale): readonly number[] {
  if (isPentatonicScale(key)) return SCALE_LESSONS[key].steps;
  const entry = GUITAR_THEORY_CATALOG.find((e) => e.key === key);
  const modeKey = entry && canonicalModeKey(entry.slug);
  const steps = modeKey ? ALL_MODES[modeKey] : undefined;
  if (!steps) throw new Error(`No steps for guitar scale "${key}"`);
  return steps;
}

export interface ColourRow {
  /** The degree that sets the mode apart. */
  note: ScaleDegree;
  /**
   * A major or minor triad that carries it: the second chord of the
   * two-chord drills and the mode's vamps.
   */
  chord: ScaleDegree;
  /** A second major or minor triad the longer vamps answer with. */
  answer: ScaleDegree;
}

const row = (
  note: ScaleDegree,
  chord: ScaleDegree,
  answer: ScaleDegree,
): ColourRow => ({ note, chord, answer });

/** The colour note and vamp chords of every seven-note mode. */
export const COLOUR: Readonly<Record<GuitarHeptatonicScale, ColourRow>> = {
  harmonicminor: row(7, 5, 4),
  locriannat6: row(6, 4, 5),
  ioniansharp5: row(5, 3, 4),
  doriansharp4: row(4, 2, 5),
  phrygiandominant: row(2, 2, 4),
  lydiansharp2: row(2, 7, 6),
  altereddiminished: row(7, 7, 5),
  melodicminor: row(7, 5, 4),
  dorianflat2: row(2, 7, 4),
  lydianaugmented: row(5, 3, 7),
  lydiandominant: row(4, 2, 5),
  mixolydianflat6: row(6, 4, 5),
  locriannat2: row(2, 7, 4),
  altereddominant: row(4, 2, 5),
  harmonicmajor: row(6, 4, 5),
  dorianflat5: row(5, 3, 4),
  altereddominantnat5: row(4, 2, 6),
  melodicminorsharp4: row(4, 2, 5),
  mixolydianflat2: row(2, 7, 4),
  lydianaugmentedsharp2: row(2, 7, 5),
  locriandoubleflat7: row(7, 5, 4),
  doubleharmonicmajor: row(2, 2, 4),
  lydiansharp2sharp6: row(2, 7, 2),
  ultraphrygian: row(7, 7, 6),
  doubleharmonicminor: row(4, 7, 5),
  oriental: row(5, 5, 4),
  ioniansharp2sharp5: row(2, 5, 4),
  locriandoubleflat3doubleflat7: row(3, 3, 5),
};

/**
 * A seven-note mode's five Music Maps (bar counts 1, 2, 2, 4, 4, as the
 * book's), vamping on its colour chord C and answer chord A: 1 | 1 C | 1 A |
 * 1 C 1 C | 1 C A 1. Examples 1-3 are triads, 4-5 7th chords.
 */
export function heptatonicMapDegrees(
  key: GuitarHeptatonicScale,
): readonly (readonly ScaleDegree[])[] {
  const { chord: c, answer: a } = COLOUR[key];
  return [[1], [1, c], [1, a], [1, c, 1, c], [1, c, a, 1]];
}

/** A Music Map bar of a pentatonic/blues scale: a chord of its frame. */
export interface ScaleMapChord {
  degree: ScaleDegree;
  quality: BookChordQuality;
}

const chord = (
  degree: ScaleDegree,
  quality: BookChordQuality,
): ScaleMapChord => ({ degree, quality });

const I7 = chord(1, 'dom7');
const IV7 = chord(4, 'dom7');
const V7 = chord(5, 'dom7');
const BLUES_MAPS: readonly (readonly ScaleMapChord[])[] = [
  [I7],
  [I7, IV7],
  [I7, V7],
  [I7, IV7, I7, I7],
  [I7, IV7, V7, I7],
];

/**
 * The pentatonic and blues scales' Music Maps, degrees of their chord frame
 * (the Studio's parent mode: Ionian, Aeolian, Mixolydian). Example 4 is the
 * progression the piano lesson's Practice Track loops; the blues maps bring
 * in the V7 on 3 and 5.
 */
export const SCALE_MUSIC_MAPS: Readonly<
  Record<GuitarPentatonicScale, readonly (readonly ScaleMapChord[])[]>
> = {
  majorpentatonic: [
    [chord(1, 'maj')],
    [chord(1, 'maj'), chord(4, 'maj')],
    [chord(1, 'maj'), chord(5, 'maj')],
    [chord(1, 'maj'), chord(4, 'maj'), chord(1, 'maj'), chord(4, 'maj')],
    [chord(1, 'maj'), chord(6, 'min'), chord(4, 'maj'), chord(5, 'maj')],
  ],
  minorpentatonic: [
    [chord(1, 'min')],
    [chord(1, 'min'), chord(4, 'min')],
    [chord(1, 'min'), chord(7, 'maj')],
    [chord(1, 'min'), chord(1, 'min'), chord(6, 'maj7'), chord(6, 'maj7')],
    [chord(1, 'min'), chord(6, 'maj'), chord(7, 'maj'), chord(1, 'min')],
  ],
  majorblues: BLUES_MAPS,
  minorblues: BLUES_MAPS,
};

/**
 * What each seven-note mode sounds like, in a sentence that names its colour
 * note (COLOUR.note): the key header follows it with that note in the key.
 */
export const COLOUR_TEXT: Readonly<Record<GuitarHeptatonicScale, string>> = {
  harmonicminor:
    'Harmonic minor is natural minor with a raised 7 that pulls up to the root.',
  locriannat6:
    'Locrian ♮6 is Locrian with a natural 6, a touch of light in a dark mode.',
  ioniansharp5: 'Ionian ♯5 is major with a raised 5, bright but restless.',
  doriansharp4: 'Dorian ♯4 is Dorian with a raised 4 that rubs against the 5.',
  phrygiandominant:
    'Phrygian dominant sounds major, with a dark ♭2 just above the root.',
  lydiansharp2:
    'Lydian ♯2 is Lydian with a raised 2, a wide leap up from the root.',
  altereddiminished:
    'Altered diminished is the darkest mode of its family. Its 𝄫7 sits a step and a half below the root.',
  melodicminor:
    'Melodic minor is minor with a major 7, smooth and a little jazzy.',
  dorianflat2: 'Dorian ♭2 is Dorian with a dark ♭2 just above the root.',
  lydianaugmented:
    'Lydian augmented raises the 5 as well as the 4, so it floats and never settles.',
  lydiandominant:
    'Lydian dominant is a bluesy major mode with a bright, raised 4.',
  mixolydianflat6:
    'Mixolydian ♭6 sounds major below and minor above. Its ♭6 adds a wistful touch.',
  locriannat2:
    'Locrian ♮2 is Locrian with a natural 2, which softens a very dark mode.',
  altereddominant:
    'Altered dominant is made for tense dominant chords. Its ♭4 sounds as the chord’s major 3.',
  harmonicmajor:
    'Harmonic major is major with a ♭6, bright with a shadow of minor.',
  dorianflat5:
    'Dorian ♭5 is Dorian with a lowered 5 that darkens its minor sound.',
  altereddominantnat5:
    'Altered dominant ♮5 bends a dominant chord but keeps its 5. Its ♭4 sounds as the major 3.',
  melodicminorsharp4:
    'Melodic minor ♯4 adds a raised 4 to melodic minor, bright and tense at once.',
  mixolydianflat2:
    'Mixolydian ♭2 is Mixolydian with a dark ♭2 just above the root.',
  lydianaugmentedsharp2:
    'Lydian augmented ♯2 adds a raised 2 to Lydian augmented, wide and strange.',
  locriandoubleflat7:
    'Locrian 𝄫7 lowers Locrian’s 7 once more, to a step and a half below the root.',
  doubleharmonicmajor:
    'Double harmonic major sets a dark ♭2 against a major 3, a strong Eastern sound.',
  lydiansharp2sharp6:
    'Lydian ♯2 ♯6 opens with a step and a half above the root, bright and exotic.',
  ultraphrygian:
    'Ultraphrygian is one of the darkest scales. Its 𝄫7 sits a step and a half below the root.',
  doubleharmonicminor:
    'Double harmonic minor is harmonic minor with a raised 4, dramatic and Eastern.',
  oriental:
    'Oriental is a dominant-sounding mode bent by a ♭2 and a lowered 5.',
  ioniansharp2sharp5:
    'Ionian ♯2 ♯5 is major with a raised 2 that leaps up toward the 3.',
  locriandoubleflat3doubleflat7:
    'Locrian 𝄫3 𝄫7 is the strangest of its family. Its 𝄫3 sounds like a 2, so its home chord has no 3.',
};

/** The pentatonic/blues scale sharing a scale's notes: which note is its home, and its name. */
export const SCALE_PARTNER: Readonly<
  Record<GuitarPentatonicScale, { index: number; scale: GuitarPentatonicScale }>
> = {
  majorpentatonic: { index: 4, scale: 'minorpentatonic' },
  minorpentatonic: { index: 1, scale: 'majorpentatonic' },
  majorblues: { index: 5, scale: 'minorblues' },
  minorblues: { index: 1, scale: 'majorblues' },
};

/** Where the blues scales keep their blue note: ♭3 in major blues, ♯4 in minor. */
export const BLUE_NOTE_INDEX: Readonly<
  Partial<Record<GuitarPentatonicScale, number>>
> = {
  majorblues: 2,
  minorblues: 3,
};
