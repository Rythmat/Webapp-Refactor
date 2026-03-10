/**
 * Phase 1 — Bidirectional genre ID mapping between curriculum and engine.
 *
 * Curriculum uses UPPER_CASE/hyphenated names (e.g. 'POP', 'HIP-HOP').
 * Engine uses Title Case names (e.g. 'Pop', 'Hip Hop').
 *
 * The curriculum has 14 genres; the engine's GenreName type has 13
 * (plus a few extras in GENRE_STRUM). Phase 1A extends GenreName to
 * cover all curriculum genres.
 */

import type { GenreName } from '@prism/engine';

/** The 14 curriculum genre identifiers (as they appear in GCM v7) */
export type CurriculumGenreId =
  | 'AFRICAN'
  | 'BLUES'
  | 'ELECTRONIC'
  | 'FOLK'
  | 'FUNK'
  | 'HIP-HOP'
  | 'JAM BAND'
  | 'JAZZ'
  | 'LATIN'
  | 'NEO SOUL'
  | 'POP'
  | 'R&B'
  | 'REGGAE'
  | 'ROCK';

/** Curriculum genre → engine GenreName */
export const CURRICULUM_TO_ENGINE_GENRE: Record<CurriculumGenreId, GenreName> =
  {
    POP: 'Pop',
    ROCK: 'Rock',
    'HIP-HOP': 'Hip Hop',
    'JAM BAND': 'Jam Band',
    FUNK: 'Funk',
    'NEO SOUL': 'Neo Soul',
    JAZZ: 'Jazz',
    'R&B': 'R&B',
    REGGAE: 'Reggae',
    LATIN: 'Latin',
    FOLK: 'Folk',
    BLUES: 'Blues',
    ELECTRONIC: 'Electronic',
    AFRICAN: 'African',
  };

/** Engine GenreName → curriculum genre ID */
export const ENGINE_TO_CURRICULUM_GENRE: Partial<
  Record<GenreName, CurriculumGenreId>
> = {
  Pop: 'POP',
  Rock: 'ROCK',
  'Hip Hop': 'HIP-HOP',
  'Jam Band': 'JAM BAND',
  Funk: 'FUNK',
  'Neo Soul': 'NEO SOUL',
  Jazz: 'JAZZ',
  'R&B': 'R&B',
  Reggae: 'REGGAE',
  Latin: 'LATIN',
  Folk: 'FOLK',
  Blues: 'BLUES',
  Electronic: 'ELECTRONIC',
  African: 'AFRICAN',
};

/**
 * Engine genres that have no curriculum equivalent.
 * These are sub-genres of Latin in the curriculum's taxonomy.
 * Fallback: map to 'LATIN' for curriculum content selection.
 */
export const ENGINE_ONLY_GENRES: Record<string, CurriculumGenreId> = {
  Salsa: 'LATIN',
  Merengue: 'LATIN',
  Bossa: 'LATIN',
  Samba: 'LATIN',
  Ballad: 'POP', // Ballad → Pop as closest curriculum match
};

/**
 * Slug form used in URLs and internal keys (lowercase, hyphens).
 * e.g. 'neo-soul', 'hip-hop', 'jam-band'
 */
export const CURRICULUM_GENRE_SLUGS: Record<CurriculumGenreId, string> = {
  AFRICAN: 'african',
  BLUES: 'blues',
  ELECTRONIC: 'electronic',
  FOLK: 'folk',
  FUNK: 'funk',
  'HIP-HOP': 'hip-hop',
  'JAM BAND': 'jam-band',
  JAZZ: 'jazz',
  LATIN: 'latin',
  'NEO SOUL': 'neo-soul',
  POP: 'pop',
  'R&B': 'rnb',
  REGGAE: 'reggae',
  ROCK: 'rock',
};

/** All 14 curriculum genre IDs as an array */
export const CURRICULUM_GENRE_IDS: CurriculumGenreId[] = Object.keys(
  CURRICULUM_TO_ENGINE_GENRE,
) as CurriculumGenreId[];

/** Reverse: slug → curriculum genre ID */
export const SLUG_TO_CURRICULUM_GENRE: Record<string, CurriculumGenreId> =
  Object.fromEntries(
    Object.entries(CURRICULUM_GENRE_SLUGS).map(([k, v]) => [
      v,
      k as CurriculumGenreId,
    ]),
  );

/**
 * Convert a curriculum genre ID to engine GenreName.
 */
export function curriculumToEngineGenre(id: CurriculumGenreId): GenreName {
  return CURRICULUM_TO_ENGINE_GENRE[id];
}

/**
 * Convert an engine GenreName to curriculum genre ID.
 * Falls back via ENGINE_ONLY_GENRES for sub-genres like Salsa → LATIN.
 */
export function engineToCurriculumGenre(
  name: GenreName,
): CurriculumGenreId | undefined {
  return ENGINE_TO_CURRICULUM_GENRE[name] ?? ENGINE_ONLY_GENRES[name];
}
