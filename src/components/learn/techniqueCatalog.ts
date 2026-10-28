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

// Guitar's key centers are in Theory (The Guitar Atlas's are Ionian
// (Major)); its Technique is the playing itself.
export const GUITAR_TECHNIQUE_DATA: readonly TechniqueItem[] = [
  {
    title: 'Guitar Harmonics',
    route: LearnRoutes.guitarHarmonics(),
    image: '/learn-tiles/beginner-hex.svg',
    interactive: true,
    // The perfect 4th: the 5th-fret harmonic's node, a quarter of the string.
    ratio: [3, 4],
  },
];

export function techniqueDataFor(
  instrument: LearnInstrument,
): readonly TechniqueItem[] {
  // None yet: bass is Theory only, ukulele Theory and Songs.
  if (instrument === 'bass' || instrument === 'ukulele') return [];
  return instrument === 'guitar' ? GUITAR_TECHNIQUE_DATA : PIANO_TECHNIQUE_DATA;
}
