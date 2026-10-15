// ── Guitar Theory: the catalog ────────────────────────────────────────────
// Every Learn → Theory tile guitar can teach, by the tile's own slug: what
// family it is in, what lessons call it, which engine key builds it and the
// id its progress is kept under. Names only, no lesson data: the Learn hub
// imports this, and a lesson's data loads only when it opens.
//
// A family goes live by joining LIVE_GUITAR_FAMILIES; until then its tiles
// read "Coming soon for guitar" and its URLs go back to Theory.

import { SCALE_LESSONS } from '@/lib/learn/scaleLessons';
import {
  GUITAR_MODES,
  GUITAR_MODE_NAME,
  GUITAR_MODE_TITLE,
} from './modes/modeNames';
import type {
  GuitarHeptatonicScale,
  GuitarMode,
  GuitarPentatonicScale,
  GuitarScaleFamily,
  GuitarScaleKey,
} from './types';

export interface GuitarTheoryEntry {
  /** The Theory tile's slug, as URLs carry it: 'ionian#5', 'dorian♭2'. */
  slug: string;
  /** The engine's ASCII key for it: 'ioniansharp5', 'dorianflat2'. */
  key: GuitarScaleKey;
  family: GuitarScaleFamily;
  /** Lesson headers: 'Ionian (Major)', 'Phrygian Dominant', 'Ionian ♯5'. */
  title: string;
  /** In a sentence: 'C {mode}' → 'C Ionian', 'C Harmonic Minor'. */
  name: string;
  /** Saved progress lives under this id; never rename one. */
  genre: string;
  /** Its number within its family (Dorian 2, Locrian ♮6 2); null for pentatonic/blues. */
  degree: number | null;
  /** Pentatonic/blues lessons have no Chords chapter. */
  hasChords: boolean;
  /**
   * The diatonic mode closest to it (most notes in common, then the same 3rd
   * and 5th): what colours and spells it where only the seven modes are known.
   */
  colourMode: GuitarMode;
}

const diatonic: GuitarTheoryEntry[] = GUITAR_MODES.map((mode, i) => ({
  slug: mode,
  key: mode,
  family: 'diatonic',
  title: GUITAR_MODE_TITLE[mode],
  name: GUITAR_MODE_NAME[mode],
  // As guitarModeGenre names them: Ionian keeps the id it had as Applied
  // Theory Fundamentals.
  genre:
    mode === 'ionian'
      ? 'guitar-applied-theory-fundamentals'
      : `guitar-mode-${mode}`,
  degree: i + 1,
  hasChords: true,
  colourMode: mode,
}));

const PENTATONIC_KEYS: readonly GuitarPentatonicScale[] = [
  'majorpentatonic',
  'minorpentatonic',
  'majorblues',
  'minorblues',
];

/** As piano's lesson flows colour them: major on Ionian, minor on Dorian. */
const PENTATONIC_COLOUR: Readonly<Record<GuitarPentatonicScale, GuitarMode>> = {
  majorpentatonic: 'ionian',
  minorpentatonic: 'dorian',
  majorblues: 'ionian',
  minorblues: 'dorian',
};

const pentatonicBlues: GuitarTheoryEntry[] = PENTATONIC_KEYS.map((key) => ({
  slug: key,
  key,
  family: 'pentatonic-blues',
  title: SCALE_LESSONS[key].title,
  name: SCALE_LESSONS[key].title,
  genre: `guitar-scale-${key}`,
  degree: null,
  hasChords: false,
  colourMode: PENTATONIC_COLOUR[key],
}));

/** [tile slug, engine key, title, colour mode], in the family's degree order. */
type FamilyRow = readonly [string, GuitarHeptatonicScale, string, GuitarMode];

function family(
  name: GuitarScaleFamily,
  rows: readonly FamilyRow[],
): GuitarTheoryEntry[] {
  return rows.map(([slug, key, title, colourMode], i) => ({
    slug,
    key,
    family: name,
    title,
    name: title,
    genre: `guitar-mode-${key}`,
    degree: i + 1,
    hasChords: true,
    colourMode,
  }));
}

const harmonicMinor = family('harmonic-minor', [
  ['harmonicminor', 'harmonicminor', 'Harmonic Minor', 'aeolian'],
  ['locriannat6', 'locriannat6', 'Locrian ♮6', 'locrian'],
  ['ionian#5', 'ioniansharp5', 'Ionian ♯5', 'ionian'],
  ['dorian#4', 'doriansharp4', 'Dorian ♯4', 'dorian'],
  ['phrygiandominant', 'phrygiandominant', 'Phrygian Dominant', 'phrygian'],
  ['lydian#2', 'lydiansharp2', 'Lydian ♯2', 'lydian'],
  ['altereddiminished', 'altereddiminished', 'Altered Diminished', 'locrian'],
]);

const melodicMinor = family('melodic-minor', [
  ['melodicminor', 'melodicminor', 'Melodic Minor', 'dorian'],
  ['dorian♭2', 'dorianflat2', 'Dorian ♭2', 'dorian'],
  ['lydianaugmented', 'lydianaugmented', 'Lydian Augmented', 'lydian'],
  ['lydiandominant', 'lydiandominant', 'Lydian Dominant', 'lydian'],
  // The tile's slug says ♮6; the mode (and the tile's title) is ♭6.
  ['mixolydiannat6', 'mixolydianflat6', 'Mixolydian ♭6', 'mixolydian'],
  ['locriannat2', 'locriannat2', 'Locrian ♮2', 'locrian'],
  ['altereddominant', 'altereddominant', 'Altered Dominant', 'locrian'],
]);

const harmonicMajor = family('harmonic-major', [
  ['harmonicmajor', 'harmonicmajor', 'Harmonic Major', 'ionian'],
  ['dorian♭5', 'dorianflat5', 'Dorian ♭5', 'dorian'],
  [
    'altereddominantnat5',
    'altereddominantnat5',
    'Altered Dominant ♮5',
    'phrygian',
  ],
  ['melodicminor#4', 'melodicminorsharp4', 'Melodic Minor ♯4', 'lydian'],
  ['mixolydian♭2', 'mixolydianflat2', 'Mixolydian ♭2', 'mixolydian'],
  [
    'lydianaugmented#2',
    'lydianaugmentedsharp2',
    'Lydian Augmented ♯2',
    'lydian',
  ],
  ['locrian𝄫7', 'locriandoubleflat7', 'Locrian 𝄫7', 'locrian'],
]);

const doubleHarmonic = family('double-harmonic', [
  [
    'doubleharmonicmajor',
    'doubleharmonicmajor',
    'Double Harmonic Major',
    'ionian',
  ],
  ['lydian#2#6', 'lydiansharp2sharp6', 'Lydian ♯2 ♯6', 'lydian'],
  ['ultraphrygian', 'ultraphrygian', 'Ultraphrygian', 'phrygian'],
  [
    'doubleharmonicminor',
    'doubleharmonicminor',
    'Double Harmonic Minor',
    'aeolian',
  ],
  ['oriental', 'oriental', 'Oriental', 'mixolydian'],
  ['ionian#2#5', 'ioniansharp2sharp5', 'Ionian ♯2 ♯5', 'ionian'],
  ['locrian𝄫3𝄫7', 'locriandoubleflat3doubleflat7', 'Locrian 𝄫3 𝄫7', 'locrian'],
]);

/** Every Theory tile guitar can teach, family by family. */
export const GUITAR_THEORY_CATALOG: readonly GuitarTheoryEntry[] = [
  ...diatonic,
  ...pentatonicBlues,
  ...harmonicMinor,
  ...melodicMinor,
  ...harmonicMajor,
  ...doubleHarmonic,
];

/** The families with guitar lessons today: all of Theory. */
export const LIVE_GUITAR_FAMILIES: ReadonlySet<GuitarScaleFamily> = new Set([
  'diatonic',
  'pentatonic-blues',
  'harmonic-minor',
  'melodic-minor',
  'harmonic-major',
  'double-harmonic',
]);

const BY_SLUG = new Map(GUITAR_THEORY_CATALOG.map((e) => [e.slug, e]));
const BY_KEY = new Map<string, GuitarTheoryEntry>(
  GUITAR_THEORY_CATALOG.map((e) => [e.key, e]),
);

/** A live tile's entry by its slug ('ionian#5'), or undefined. */
export function guitarTheoryEntry(
  slug: string | undefined,
): GuitarTheoryEntry | undefined {
  const entry = BY_SLUG.get(slug ?? '');
  return entry && LIVE_GUITAR_FAMILIES.has(entry.family) ? entry : undefined;
}

/** Whether a Theory slug has guitar lessons today. */
export function isGuitarTheorySlug(slug: string | undefined): boolean {
  return guitarTheoryEntry(slug) !== undefined;
}

/** Any scale's entry by its engine key, live or not (the engine builds both). */
export function guitarScaleEntry(key: GuitarScaleKey): GuitarTheoryEntry {
  const entry = BY_KEY.get(key);
  if (!entry) throw new Error(`Unknown guitar scale "${key}"`);
  return entry;
}

export function isGuitarScaleKey(
  key: string | undefined,
): key is GuitarScaleKey {
  return BY_KEY.has(key ?? '');
}
