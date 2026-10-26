import { CurriculumRoutes } from '@/constants/routes';
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
    route: CurriculumRoutes.genre({ genre: 'piano-fundamentals' }),
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

// Guitar has no Technique lessons yet: its lessons are in Theory (The
// Guitar Atlas's key centers are Ionian (Major)), and the Technique tab is
// hidden there.
const GUITAR_TECHNIQUE_DATA: readonly TechniqueItem[] = [];

export function techniqueDataFor(
  instrument: LearnInstrument,
): readonly TechniqueItem[] {
  return instrument === 'guitar' ? GUITAR_TECHNIQUE_DATA : PIANO_TECHNIQUE_DATA;
}
