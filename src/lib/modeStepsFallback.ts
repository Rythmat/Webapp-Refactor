import { ALL_MODES } from '@/daw/prism-engine/data/modes';

// Build lookup: lowercase ALL_MODES key → intervals
const FALLBACK_MAP = new Map<string, number[]>();
for (const [key, intervals] of Object.entries(ALL_MODES)) {
  FALLBACK_MAP.set(key.toLowerCase(), intervals);
}

// API slugs that don't match simple lowercasing of ALL_MODES keys
// (API uses #/♭/𝄫 symbols; ALL_MODES uses Sharp/Flat/DoubleFlat words)
const SLUG_ALIASES: Record<string, string> = {
  'ionian#5': 'ioniansharp5',
  'dorian#4': 'doriansharp4',
  'lydian#2': 'lydiansharp2',
  'dorian♭2': 'dorianflat2',
  'mixolydian♭2': 'mixolydianflat2',
  'dorian♭5': 'dorianflat5',
  'melodicminor#4': 'melodicminorsharp4',
  'lydianaugmented#2': 'lydianaugmentedsharp2',
  'locrian𝄫7': 'locriandoubleflat7',
  'lydian#2#6': 'lydiansharp2sharp6',
  'ionian#2#5': 'ioniansharp2sharp5',
  'locrian𝄫3𝄫7': 'locriandoubleflat3doubleflat7',
  'mixolydiannat6': 'mixolydianflat6',
  'altereddominant': 'altered',
};

/** Look up mode intervals locally when the API is unavailable. */
export function getLocalModeSteps(slug: string): number[] | undefined {
  const lower = slug.toLowerCase();
  return FALLBACK_MAP.get(lower) ?? FALLBACK_MAP.get(SLUG_ALIASES[lower] ?? '');
}
