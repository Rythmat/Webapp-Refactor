/**
 * The genre chips across the top of the timeline, after Dorot's topic chips:
 * filters, not lanes (the lanes are places). Each chip keeps the events of a
 * few lanes of music's family tree (data/genreChips.ts says which).
 *
 * A file of its own so the URL code can check a `genres=` param without the
 * genre tables.
 */
export const GENRE_CHIP_IDS = [
  'roots',
  'classical',
  'blues-jazz',
  'soul-funk',
  'rock',
  'pop',
  'hip-hop',
  'electronic',
  'latin-caribbean',
] as const;

export type GenreChipId = (typeof GENRE_CHIP_IDS)[number];

export const isGenreChipId = (value: string): value is GenreChipId =>
  (GENRE_CHIP_IDS as readonly string[]).includes(value);
