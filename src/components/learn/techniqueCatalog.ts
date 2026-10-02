import { CurriculumRoutes } from '@/constants/routes';
import type { LearnInstrument } from '@/features/learn/useInstrumentStore';

// ── Learn → Technique tiles, per instrument ────────────────────────────────

export interface TechniqueItem {
  title: string;
  route: string;
  image: string;
  interactive: boolean;
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

// Guitar has no Technique lessons yet: The Guitar Atlas's key centers are
// Theory → Ionian (Major) on guitar, and the Technique tab is hidden there.
const GUITAR_TECHNIQUE_DATA: readonly TechniqueItem[] = [];

export function techniqueDataFor(
  instrument: LearnInstrument,
): readonly TechniqueItem[] {
  return instrument === 'guitar' ? GUITAR_TECHNIQUE_DATA : PIANO_TECHNIQUE_DATA;
}
