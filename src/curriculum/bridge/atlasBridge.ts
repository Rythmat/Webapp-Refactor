/**
 * Phase 22 — Atlas / Globe Integration Bridge.
 *
 * Maps geographic regions to curriculum genres and provides metadata
 * for the Atlas globe overlay. When a user taps a region on the globe,
 * this bridge identifies available curriculum content for that region.
 */

import type { CurriculumGenreId } from './genreIdMap';

// ---------------------------------------------------------------------------
// Region → Genre mapping
// ---------------------------------------------------------------------------

/** Geographic regions used by the Atlas globe */
export type AtlasRegion =
  | 'north-america'
  | 'caribbean'
  | 'south-america'
  | 'western-europe'
  | 'eastern-europe'
  | 'west-africa'
  | 'east-africa'
  | 'south-africa'
  | 'middle-east'
  | 'south-asia'
  | 'east-asia'
  | 'southeast-asia'
  | 'oceania';

export interface GenreRegionInfo {
  genre: CurriculumGenreId;
  region: AtlasRegion;
  displayLabel: string;
  culturalContext: string;
}

/**
 * Maps curriculum genres to their primary geographic regions and context.
 */
const GENRE_REGION_MAP: GenreRegionInfo[] = [
  {
    genre: 'POP',
    region: 'north-america',
    displayLabel: 'Pop',
    culturalContext:
      'Global pop music rooted in American and British traditions',
  },
  {
    genre: 'ROCK',
    region: 'north-america',
    displayLabel: 'Rock',
    culturalContext:
      'American and British rock traditions from the 1950s onward',
  },
  {
    genre: 'HIP-HOP',
    region: 'north-america',
    displayLabel: 'Hip-Hop',
    culturalContext: 'Born in the Bronx, New York in the 1970s',
  },
  {
    genre: 'JAZZ',
    region: 'north-america',
    displayLabel: 'Jazz',
    culturalContext:
      'African-American art form from New Orleans, developed nationwide',
  },
  {
    genre: 'BLUES',
    region: 'north-america',
    displayLabel: 'Blues',
    culturalContext: 'Deep South African-American music tradition',
  },
  {
    genre: 'R&B',
    region: 'north-america',
    displayLabel: 'R&B',
    culturalContext: 'Rhythm and blues, evolving from gospel and jazz',
  },
  {
    genre: 'FUNK',
    region: 'north-america',
    displayLabel: 'Funk',
    culturalContext: 'African-American groove music from the 1960s-70s',
  },
  {
    genre: 'NEO SOUL',
    region: 'north-america',
    displayLabel: 'Neo Soul',
    culturalContext: 'Modern R&B/soul renaissance of the late 1990s',
  },
  {
    genre: 'FOLK',
    region: 'western-europe',
    displayLabel: 'Folk',
    culturalContext: 'European and American acoustic traditions',
  },
  {
    genre: 'ELECTRONIC',
    region: 'western-europe',
    displayLabel: 'Electronic',
    culturalContext: 'European electronic music from Germany, UK, and France',
  },
  {
    genre: 'REGGAE',
    region: 'caribbean',
    displayLabel: 'Reggae',
    culturalContext: 'Jamaican music rooted in ska and rocksteady',
  },
  {
    genre: 'LATIN',
    region: 'caribbean',
    displayLabel: 'Latin',
    culturalContext: 'Caribbean and Latin American dance music traditions',
  },
  {
    genre: 'AFRICAN',
    region: 'west-africa',
    displayLabel: 'African',
    culturalContext: 'West African rhythmic traditions including Afrobeat',
  },
  {
    genre: 'JAM BAND',
    region: 'north-america',
    displayLabel: 'Jam Band',
    culturalContext: 'American improvisational rock tradition',
  },
];

/**
 * Get curriculum genres available for a geographic region.
 */
export function getGenresForRegion(region: AtlasRegion): GenreRegionInfo[] {
  return GENRE_REGION_MAP.filter((entry) => entry.region === region);
}

/**
 * Get atlas metadata for a curriculum genre.
 */
export function getAtlasMetadata(
  genre: CurriculumGenreId,
): GenreRegionInfo | undefined {
  return GENRE_REGION_MAP.find((entry) => entry.genre === genre);
}

/**
 * Get all regions that have curriculum content.
 */
export function getRegionsWithCurriculum(): AtlasRegion[] {
  const regions = new Set(GENRE_REGION_MAP.map((e) => e.region));
  return [...regions];
}

/**
 * Check if a region has curriculum content available.
 */
export function regionHasCurriculum(region: AtlasRegion): boolean {
  return GENRE_REGION_MAP.some((e) => e.region === region);
}
