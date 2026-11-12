import { BASS_THEORY_CATALOG } from '@/curriculum/data/bass/theoryCatalog';
import {
  GUITAR_THEORY_CATALOG,
  type GuitarTheoryEntry,
} from '@/curriculum/data/guitar/theoryCatalog';
import { UKULELE_THEORY_CATALOG } from '@/curriculum/data/ukulele/theoryCatalog';
import type { LearnInstrument } from '@/features/learn/useInstrumentStore';

// ── Theory's sub categories ────────────────────────────────────────────────
// Each family as a path: its parent mode learned key by key (owner, 2026-11-02),
// then one stop for each of its other modes, key chosen at the stop. Names only:
// the Learn page reads this, and no lesson data loads until a lesson opens.

export type TheoryFamilyId =
  | 'diatonic'
  | 'pentatonic-blues'
  | 'harmonic-minor'
  | 'melodic-minor'
  | 'harmonic-major'
  | 'double-harmonic'
  | 'relative'
  | 'parallel';

export interface TheoryFamily {
  id: TheoryFamilyId;
  title: string;
  description: string;
  /** The mode learned in every key; the rest follow it, in family order. */
  parent?: string;
  /** What each level's popup says it teaches. */
  parentGoals?: readonly string[];
  goals: readonly string[];
}

export const THEORY_FAMILIES: readonly TheoryFamily[] = [
  {
    id: 'diatonic',
    title: 'Diatonic Modes',
    description:
      'The seven modes behind most of the music you know, starting from the major scale in every key.',
    parent: 'ionian',
    parentGoals: [
      'Play the major scale and its chords in all 12 keys',
      'Hear how each key relates to the next',
    ],
    goals: [
      'Hear what each mode changes from the major scale',
      'Play each mode’s melody and chords in any key',
    ],
  },
  {
    id: 'pentatonic-blues',
    title: 'Pentatonic & Blues',
    description:
      'Five- and six-note scales that are hard to play a wrong note in, and the sound of the blues.',
    parent: 'majorpentatonic',
    parentGoals: ['Play the major pentatonic in all 12 keys'],
    goals: [
      'Move between major and minor pentatonic',
      'Add the blue note, and hear what it does',
    ],
  },
  {
    id: 'harmonic-minor',
    title: 'Harmonic Minor',
    description:
      'One raised note gives minor keys a strong pull home, and seven modes with an unmistakable colour.',
    parent: 'ionian#5',
    parentGoals: ['Play Ionian ♯5 and its chords in all 12 keys'],
    goals: [
      'Hear the wide step that defines this family',
      'Play each mode’s melody and chords in any key',
    ],
  },
  {
    id: 'melodic-minor',
    title: 'Melodic Minor',
    description:
      'The sound of modern jazz harmony: smooth lines, altered chords and bright minor colour.',
    parent: 'mixolydiannat6',
    parentGoals: ['Play Mixolydian ♭6 and its chords in all 12 keys'],
    goals: [
      'Hear how these modes colour dominant chords',
      'Play each mode’s melody and chords in any key',
    ],
  },
  {
    id: 'harmonic-major',
    title: 'Harmonic Major',
    description:
      'The major scale with one note lowered, which gives it a dark turn and a family of unusual modes.',
    parent: 'harmonicmajor',
    parentGoals: ['Play Harmonic Major and its chords in all 12 keys'],
    goals: [
      'Hear what the lowered sixth does to major',
      'Play each mode’s melody and chords in any key',
    ],
  },
  {
    id: 'double-harmonic',
    title: 'Double Harmonic',
    description:
      'Two wide steps in one scale, for the most dramatic and exotic sounds in Theory.',
    parent: 'doubleharmonicmajor',
    parentGoals: ['Play Double Harmonic Major and its chords in all 12 keys'],
    goals: [
      'Hear the two wide steps that define this family',
      'Play each mode’s melody and chords in any key',
    ],
  },
  {
    id: 'relative',
    title: 'Relative Modes',
    description:
      'Seven modes sharing one key signature: the same notes, with a different note as home.',
    goals: [
      'See one key signature hold all seven modes',
      'Hear how changing the home note changes the mood',
    ],
  },
  {
    id: 'parallel',
    title: 'Parallel Modes',
    description:
      'Seven modes on one home note: the same root, with different notes above it.',
    goals: [
      'Compare all seven modes from a single root',
      'Hear which notes make each mode what it is',
    ],
  },
];

export const theoryFamily = (id: string | undefined) =>
  THEORY_FAMILIES.find((family) => family.id === id);

/** The families with a catalog of their own: Relative and Parallel only link. */
const CATALOG_FAMILIES: ReadonlySet<string> = new Set([
  'diatonic',
  'pentatonic-blues',
  'harmonic-minor',
  'melodic-minor',
  'harmonic-major',
  'double-harmonic',
]);

const CATALOGS: Readonly<
  Record<LearnInstrument, readonly GuitarTheoryEntry[]>
> = {
  // Piano's tiles go by the same slugs, and its lessons don't use the rest.
  piano: GUITAR_THEORY_CATALOG,
  guitar: GUITAR_THEORY_CATALOG,
  bass: BASS_THEORY_CATALOG,
  ukulele: UKULELE_THEORY_CATALOG,
};

/** A family's modes on an instrument, parent first, then in order from it. */
export function familyModes(
  instrument: LearnInstrument,
  family: TheoryFamily,
): readonly GuitarTheoryEntry[] {
  if (!CATALOG_FAMILIES.has(family.id)) return [];
  const modes = CATALOGS[instrument].filter((e) => e.family === family.id);
  const from = Math.max(
    0,
    modes.findIndex((e) => e.slug === family.parent),
  );
  return [...modes.slice(from), ...modes.slice(0, from)];
}

/** The family a mode's slug belongs to, on any instrument. */
export function familyOfMode(slug: string): TheoryFamily | undefined {
  const entry = GUITAR_THEORY_CATALOG.find((e) => e.slug === slug);
  return entry ? theoryFamily(entry.family) : undefined;
}

/** The twelve keys, as the lessons spell them, round the circle of fifths. */
export const THEORY_KEYS = [
  'C',
  'G',
  'D',
  'A',
  'E',
  'B',
  'F♯',
  'D♭',
  'A♭',
  'E♭',
  'B♭',
  'F',
] as const;

/** Relative's tiles: a key signature's accidentals and its colour. */
export const KEY_SIGNATURE_TITLES: Readonly<Record<string, string>> = {
  C: '♮ (Red)',
  G: '♯ (Vermillion)',
  D: '♯♯ (Orange)',
  A: '♯♯♯ (Amber)',
  E: '♯♯♯♯ (Green)',
  B: '♯♯♯♯♯ (Sage)',
  'F♯': '♯♯♯♯♯♯ (Teal)',
  'D♭': '♭♭♭♭♭ (Blue)',
  'A♭': '♭♭♭♭ (Indigo)',
  'E♭': '♭♭♭ (Purple)',
  'B♭': '♭♭ (Magenta)',
  F: '♭ (Pink)',
};

const SEMITONE_NAMES = [
  'C',
  'D♭',
  'D',
  'E♭',
  'E',
  'F',
  'F♯',
  'G',
  'A♭',
  'A',
  'B♭',
  'B',
] as const;

const MAJOR_STEPS = [0, 2, 4, 5, 7, 9, 11] as const;

export const DIATONIC_BY_DEGREE = [
  { slug: 'ionian', title: 'Ionian' },
  { slug: 'dorian', title: 'Dorian' },
  { slug: 'phrygian', title: 'Phrygian' },
  { slug: 'lydian', title: 'Lydian' },
  { slug: 'mixolydian', title: 'Mixolydian' },
  { slug: 'aeolian', title: 'Aeolian' },
  { slug: 'locrian', title: 'Locrian' },
] as const;

/** The note a diatonic mode starts on in a major key: Dorian in C is on D. */
export function relativeRoot(majorKey: string, degree: number): string {
  const root = SEMITONE_NAMES.indexOf(
    majorKey as (typeof SEMITONE_NAMES)[number],
  );
  return SEMITONE_NAMES[(Math.max(0, root) + MAJOR_STEPS[degree]) % 12];
}

/** Each family's colour, by a key's: never A or D, too near the brand yellow. */
export const FAMILY_ACCENT_KEY: Readonly<Record<TheoryFamilyId, string>> = {
  diatonic: 'F#',
  'pentatonic-blues': 'E',
  'harmonic-minor': 'B♭',
  'melodic-minor': 'E♭',
  'harmonic-major': 'A♭',
  'double-harmonic': 'D♭',
  relative: 'B',
  parallel: 'F',
};
