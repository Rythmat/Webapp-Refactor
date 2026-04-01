/**
 * Phase 3 — Genre bridge utilities.
 *
 * Runtime functions that translate between curriculum and engine genre names,
 * with fallback handling for engine-only sub-genres.
 */

import type { GenreName } from '@prism/engine';
import {
  CURRICULUM_TO_ENGINE_GENRE,
  ENGINE_TO_CURRICULUM_GENRE,
  ENGINE_ONLY_GENRES,
  CURRICULUM_GENRE_SLUGS,
  SLUG_TO_CURRICULUM_GENRE,
  curriculumToEngineGenre,
  engineToCurriculumGenre,
  type CurriculumGenreId,
} from './genreIdMap';

// Re-export core translation functions
export { curriculumToEngineGenre, engineToCurriculumGenre };

/**
 * Get the URL-safe slug for a curriculum genre.
 * e.g. 'NEO SOUL' → 'neo-soul', 'R&B' → 'rnb'
 */
export function genreToSlug(genre: CurriculumGenreId): string {
  return CURRICULUM_GENRE_SLUGS[genre];
}

/**
 * Get the curriculum genre ID from a URL slug.
 * e.g. 'neo-soul' → 'NEO SOUL', 'rnb' → 'R&B'
 */
export function slugToGenre(slug: string): CurriculumGenreId | undefined {
  return SLUG_TO_CURRICULUM_GENRE[slug];
}

/**
 * Check if an engine genre name has a direct curriculum equivalent
 * (not via fallback).
 */
export function isDirectCurriculumGenre(name: GenreName): boolean {
  return name in ENGINE_TO_CURRICULUM_GENRE;
}

/**
 * Check if an engine genre is a sub-genre that maps via fallback.
 * e.g. 'Salsa' → true (falls back to LATIN)
 */
export function isSubGenre(name: string): boolean {
  return name in ENGINE_ONLY_GENRES;
}

/**
 * Get all 14 curriculum genre IDs.
 */
export function getAllCurriculumGenres(): CurriculumGenreId[] {
  return Object.keys(CURRICULUM_TO_ENGINE_GENRE) as CurriculumGenreId[];
}

/**
 * Get all genre slugs for URL routing.
 */
export function getAllGenreSlugs(): string[] {
  return Object.values(CURRICULUM_GENRE_SLUGS);
}
