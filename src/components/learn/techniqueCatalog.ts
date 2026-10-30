import { CurriculumRoutes, LearnRoutes } from '@/constants/routes';
import type { LearnInstrument } from '@/features/learn/useInstrumentStore';

// ── Learn → Technique tiles, per instrument ────────────────────────────────

export interface TechniqueItem {
  title: string;
  route: string;
  image: string;
  interactive: boolean;
  /** The interval its tile draws (a Lissajous figure, owner 2026-10-26). */
  ratio: readonly [number, number];
}

export const PIANO_TECHNIQUE_DATA: readonly TechniqueItem[] = [
  {
    title: 'Piano Anatomy',
    route: LearnRoutes.pianoAnatomy(),
    image: '/learn-tiles/beginner-hex.svg',
    interactive: true,
    // The perfect 4th: distinct from the two tiles beside it.
    ratio: [3, 4],
  },
  {
    title: 'Keyboard Anatomy',
    route: LearnRoutes.keyboardAnatomy(),
    image: '/learn-tiles/beginner-hex.svg',
    interactive: true,
    // The major 3rd: distinct from the tiles beside it.
    ratio: [4, 5],
  },
  {
    title: 'Synth Anatomy',
    route: LearnRoutes.synthAnatomy(),
    image: '/learn-tiles/beginner-hex.svg',
    interactive: true,
    // The minor 3rd: distinct from the tiles beside it.
    ratio: [5, 6],
  },
  {
    title: 'Piano Fundamentals',
    route: CurriculumRoutes.pianoFundamentals(),
    image: '/learn-tiles/beginner-hex.svg',
    interactive: true,
    // The octave: where the keyboard starts.
    ratio: [1, 2],
  },
  {
    title: 'Applied Theory Fundamentals',
    route: CurriculumRoutes.appliedTheoryFundamentals(),
    image: '/learn-tiles/beginner-hex.svg',
    interactive: true,
    // The fifth: the logo's own curve.
    ratio: [2, 3],
  },
  // Music Literacy is not a Technique tile: it is a path across Learn, the
  // Studio and the Arcade, Learn → Start Here (musicLiteracy/literacyPath.ts).
];

/** A trial song lesson, DEV only: the song isn't licensed. */
export const DEV_PIANO_TECHNIQUE_DATA: readonly TechniqueItem[] = import.meta
  .env.DEV
  ? [
      {
        title: 'Linus and Lucy',
        route: LearnRoutes.linusAndLucy(),
        image: '/learn-tiles/beginner-hex.svg',
        interactive: true,
        // The major 3rd: the theme's C under its A♭, inverted.
        ratio: [4, 5],
      },
    ]
  : [];

// Guitar's key centers are in Theory (The Guitar Atlas's are Ionian
// (Major)); its Technique is the playing itself.
export const GUITAR_TECHNIQUE_DATA: readonly TechniqueItem[] = [
  {
    title: 'Guitar Anatomy',
    route: LearnRoutes.guitarAnatomy(),
    image: '/learn-tiles/beginner-hex.svg',
    interactive: true,
    // The octave: the 12th fret halves the string.
    ratio: [1, 2],
  },
  {
    title: 'Guitar Harmonics',
    route: LearnRoutes.guitarHarmonics(),
    image: '/learn-tiles/beginner-hex.svg',
    interactive: true,
    // The perfect 4th: the 5th-fret harmonic's node, a quarter of the string.
    ratio: [3, 4],
  },
];

export const BASS_TECHNIQUE_DATA: readonly TechniqueItem[] = [
  {
    title: 'Bass Anatomy',
    route: LearnRoutes.bassAnatomy(),
    image: '/learn-tiles/beginner-hex.svg',
    interactive: true,
    // The octave: the 12th fret halves the string.
    ratio: [1, 2],
  },
];

export const UKULELE_TECHNIQUE_DATA: readonly TechniqueItem[] = [
  {
    title: 'Ukulele Anatomy',
    route: LearnRoutes.ukuleleAnatomy(),
    image: '/learn-tiles/beginner-hex.svg',
    interactive: true,
    // The octave: the 12th fret halves the string.
    ratio: [1, 2],
  },
];

export function techniqueDataFor(
  instrument: LearnInstrument,
): readonly TechniqueItem[] {
  if (instrument === 'ukulele') return UKULELE_TECHNIQUE_DATA;
  if (instrument === 'bass') return BASS_TECHNIQUE_DATA;
  return instrument === 'guitar' ? GUITAR_TECHNIQUE_DATA : PIANO_TECHNIQUE_DATA;
}
