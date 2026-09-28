import { CurriculumRoutes } from '@/constants/routes';
import type { LearnInstrument } from '@/features/learn/useInstrumentStore';

// ── Learn → Technique tiles, per instrument ────────────────────────────────

export interface TechniqueItem {
  title: string;
  route: string;
  image: string;
  interactive: boolean;
  /**
   * Saved-items id. Piano tiles are saved by title (as they always were);
   * guitar tiles share piano's titles, so they carry their own id.
   */
  savedId?: string;
}

export const PIANO_TECHNIQUE_DATA: readonly TechniqueItem[] = [
  {
    title: 'Piano Fundamentals',
    route: CurriculumRoutes.genre({ genre: 'piano-fundamentals' }),
    image: '/learn-tiles/beginner-hex.svg',
    interactive: true,
  },
  {
    title: 'Applied Theory Fundamentals',
    route: CurriculumRoutes.appliedTheoryFundamentals(),
    image: '/learn-tiles/beginner-hex.svg',
    interactive: true,
  },
];

// The Guitar Atlas has no Guitar Fundamentals pages yet, so guitar starts with
// its key centers: the guitar Applied Theory Fundamentals.
export const GUITAR_TECHNIQUE_DATA: readonly TechniqueItem[] = [
  {
    title: 'Applied Theory Fundamentals',
    savedId: 'guitar:applied-theory-fundamentals',
    route: CurriculumRoutes.guitarAppliedTheoryFundamentals(),
    image: '/learn-tiles/beginner-hex.svg',
    interactive: true,
  },
];

export function techniqueDataFor(
  instrument: LearnInstrument,
): readonly TechniqueItem[] {
  return instrument === 'guitar' ? GUITAR_TECHNIQUE_DATA : PIANO_TECHNIQUE_DATA;
}
