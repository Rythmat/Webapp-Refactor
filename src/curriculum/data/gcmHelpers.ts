/**
 * Phase 5 — GCM accessor/query helpers.
 *
 * Provides typed access to the Genre Curriculum Map without
 * requiring callers to know the composite-key format.
 */

import type { CurriculumGenreId } from '../bridge/genreIdMap';
import type {
  GCMKey,
  GenreCurriculumEntry,
  CurriculumLevelId,
  ScaleDefinition,
  TempoRange,
} from '../types/curriculum';
import { GENRE_CURRICULUM_MAP } from './genreCurriculumMap';

// ---------------------------------------------------------------------------
// Key helpers
// ---------------------------------------------------------------------------

/** Build a composite key from genre + level. */
export function makeGCMKey(
  genre: CurriculumGenreId,
  level: CurriculumLevelId,
): GCMKey {
  return `${genre}:${level}` as GCMKey;
}

// ---------------------------------------------------------------------------
// Primary accessors
// ---------------------------------------------------------------------------

/**
 * Get a single GCM entry.  Throws if the key is missing
 * (should never happen for valid genre×level combos).
 */
export function getGCMEntry(
  genre: CurriculumGenreId,
  level: CurriculumLevelId,
): GenreCurriculumEntry {
  const key = makeGCMKey(genre, level);
  const entry = GENRE_CURRICULUM_MAP[key];
  if (!entry) {
    throw new Error(`GCM entry not found for ${key}`);
  }
  return entry;
}

/** Get all three level entries for a genre as an [L1, L2, L3] tuple. */
export function getGenreLevels(
  genre: CurriculumGenreId,
): [GenreCurriculumEntry, GenreCurriculumEntry, GenreCurriculumEntry] {
  return [
    getGCMEntry(genre, 'L1'),
    getGCMEntry(genre, 'L2'),
    getGCMEntry(genre, 'L3'),
  ];
}

// ---------------------------------------------------------------------------
// Convenience accessors
// ---------------------------------------------------------------------------

/** Flatten primary scale + alts into a single array. */
export function getAllScales(
  genre: CurriculumGenreId,
  level: CurriculumLevelId,
): ScaleDefinition[] {
  const entry = getGCMEntry(genre, level);
  const scales = [entry.melody.scale];
  if (entry.melody.scaleAlts) {
    scales.push(...entry.melody.scaleAlts);
  }
  return scales;
}

/** Get the tempo range for a genre×level. */
export function getTempoRange(
  genre: CurriculumGenreId,
  level: CurriculumLevelId,
): TempoRange {
  return getGCMEntry(genre, level).global.tempoRange;
}

/**
 * Get a single swing value.
 * If the GCM specifies a range [min, max], returns the midpoint.
 */
export function getSwingValue(
  genre: CurriculumGenreId,
  level: CurriculumLevelId,
): number {
  const swing = getGCMEntry(genre, level).global.swing;
  if (Array.isArray(swing)) {
    return Math.round((swing[0] + swing[1]) / 2);
  }
  return swing;
}

/** Get groove IDs for a genre×level. */
export function getGrooves(
  genre: CurriculumGenreId,
  level: CurriculumLevelId,
): string[] {
  return getGCMEntry(genre, level).global.grooves;
}

/** Reverse lookup: which genre×level combos use a given scale name? */
export function getGenresForScale(
  scaleName: string,
): Array<{ genre: CurriculumGenreId; level: CurriculumLevelId }> {
  const results: Array<{ genre: CurriculumGenreId; level: CurriculumLevelId }> =
    [];
  for (const entry of Object.values(GENRE_CURRICULUM_MAP)) {
    const allScales = [entry.melody.scale, ...(entry.melody.scaleAlts ?? [])];
    if (allScales.some((s) => s.name === scaleName)) {
      results.push({ genre: entry.genre, level: entry.level });
    }
  }
  return results;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const ALL_GENRES: CurriculumGenreId[] = [
  'AFRICAN',
  'BLUES',
  'ELECTRONIC',
  'FOLK',
  'FUNK',
  'HIP HOP',
  'JAM BAND',
  'JAZZ',
  'LATIN',
  'NEO SOUL',
  'POP',
  'R&B',
  'REGGAE',
  'ROCK',
];
const ALL_LEVELS: CurriculumLevelId[] = ['L1', 'L2', 'L3'];

/**
 * Verify every expected genre×level key exists in the map.
 * Returns an array of missing keys (empty = all present).
 */
export function validateMapCompleteness(): string[] {
  const missing: string[] = [];
  for (const genre of ALL_GENRES) {
    for (const level of ALL_LEVELS) {
      const key = makeGCMKey(genre, level);
      if (!(key in GENRE_CURRICULUM_MAP)) {
        missing.push(key);
      }
    }
  }
  return missing;
}
