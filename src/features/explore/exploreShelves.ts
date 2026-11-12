import type { Song } from '@/curriculum/types/songLibrary';

// ── What Explore's song shelves hold ───────────────────────────────────────
// Pure, so the pages and the tests share them. The library comes in at
// render time (the song store fills from the CDN), never at module scope.

/** How many songs a shelf shows before "See all". */
export const SHELF_SIZE = 16;

/** A genre gets its own shelf, and a "Best of" tile, from this many songs. */
export const MIN_GENRE_SONGS = 4;

const stripThe = (text: string) => text.replace(/^the\s+/i, '');

/** A song's place among equals: fixed, but not the alphabet (nearly every
 *  song's popularity is still the importer's 50, and by title a shelf
 *  would open on "(Sittin' On)…", "(They Long To Be)…"). */
function tieOrder(id: string): number {
  let hash = 2166136261;
  for (let i = 0; i < id.length; i += 1) {
    hash = Math.imul(hash ^ id.charCodeAt(i), 16777619);
  }
  return hash >>> 0;
}

const byPopularity = (a: Song, b: Song) =>
  (b.popularity ?? 0) - (a.popularity ?? 0) || tieOrder(a.id) - tieOrder(b.id);

/** By title, "The" aside: the order the whole library reads in. */
export function byTitle(songs: readonly Song[]): Song[] {
  return [...songs].sort((a, b) =>
    stripThe(a.title).localeCompare(stripThe(b.title)),
  );
}

/** The best-known songs first. */
export function popularSongs(
  songs: readonly Song[],
  limit = SHELF_SIZE,
): Song[] {
  return [...songs].sort(byPopularity).slice(0, limit);
}

/** Level 1, the best-known first: where a beginner starts. */
export function easySongs(songs: readonly Song[], limit = SHELF_SIZE): Song[] {
  return songs
    .filter((song) => song.difficulty === 1)
    .sort(byPopularity)
    .slice(0, limit);
}

/** A genre's songs, the best-known first. */
export function songsInGenre(
  songs: readonly Song[],
  slug: string,
  limit = SHELF_SIZE,
): Song[] {
  return songs
    .filter((song) => song.genreTags.includes(slug))
    .sort(byPopularity)
    .slice(0, limit);
}

export interface GenreRow {
  slug: string;
  label: string;
  count: number;
}

/**
 * The genres with enough songs to browse, in the list's own order, each
 * with how many songs it has.
 */
export function genreRows(
  songs: readonly Song[],
  genres: readonly { value: string; label: string }[],
  min = MIN_GENRE_SONGS,
): GenreRow[] {
  const counts = new Map<string, number>();
  for (const song of songs) {
    for (const tag of new Set(song.genreTags)) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  return genres
    .filter((genre) => genre.value !== 'all')
    .map((genre) => ({
      slug: genre.value,
      label: genre.label,
      count: counts.get(genre.value) ?? 0,
    }))
    .filter((row) => row.count >= min);
}

export interface ArtistRow {
  /** The artist's name in lower case: how their songs are grouped, since
   *  the library spells some names more than one way ("Ace Of Base"). */
  key: string;
  /** Their name as most of their songs spell it. */
  name: string;
  /** Their songs, the best-known first. */
  songs: Song[];
}

/** The key that groups an artist's songs. */
export const artistKey = (artist: string) => artist.trim().toLowerCase();

/** The library's artists, "The" aside alphabetical, each with their songs. */
export function artistRows(songs: readonly Song[]): ArtistRow[] {
  const groups = new Map<string, Song[]>();
  for (const song of songs) {
    const key = artistKey(song.artist);
    if (!key) continue;
    const group = groups.get(key);
    if (group) group.push(song);
    else groups.set(key, [song]);
  }
  return [...groups]
    .map(([key, group]) => {
      const spellings = new Map<string, number>();
      for (const song of group) {
        const name = song.artist.trim();
        spellings.set(name, (spellings.get(name) ?? 0) + 1);
      }
      const name = [...spellings].sort((a, b) => b[1] - a[1])[0][0];
      return { key, name, songs: [...group].sort(byPopularity) };
    })
    .sort((a, b) => stripThe(a.name).localeCompare(stripThe(b.name)));
}
