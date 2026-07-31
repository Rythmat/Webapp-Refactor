import type { DifficultyLevel, Song } from '@/curriculum/types/songLibrary';
import { fetchBundle, isContentCdnEnabled } from './manifest';

/**
 * ══════════════════════════════════════════════════════════════════════════
 *  READ THIS BEFORE TOUCHING SONGS
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Same contract as the globe events in ./contentStore.ts: `SONGS` starts EMPTY
 * and is filled in place by `ensureSongContent()` once the published bundle
 * arrives. The object identity never changes, and every consumer goes through
 * the accessor functions below — which is why moving 641 songs off the eager
 * bundle needed no changes at any of their 17 call sites.
 *
 *  1. NEVER snapshot at module scope. `const ALL = getAllSongs()` at the top of
 *     a file captures an empty library. Call it inside the component, hook, or
 *     useMemo that needs it. songStore.test.ts fails if this is violated.
 *
 *  2. Mutation does NOT re-render. Anything reading songs must mount behind
 *     <ContentGate>, which suspends until hydration resolves.
 */
export const SONGS: Record<string, Song> = {};

export let songGeneration = 0;

export type ContentSource = 'cdn' | 'bundled';

let source: ContentSource | null = null;
export const songContentSource = (): ContentSource | null => source;

const loadBundled = async (): Promise<Record<string, Song>> => {
  const module = await import('@/curriculum/data/songs/bundled');
  return module.BUNDLED_SONGS;
};

const loadSongs = async (): Promise<{
  songs: Record<string, Song>;
  from: ContentSource;
}> => {
  if (!isContentCdnEnabled()) {
    return { songs: await loadBundled(), from: 'bundled' };
  }

  try {
    const list = await fetchBundle<Song>('songs');
    if (list.length === 0) throw new Error('published bundle was empty');
    return {
      songs: Object.fromEntries(list.map((song) => [song.id, song])),
      from: 'cdn',
    };
  } catch (caught) {
    console.error(
      '[content] songs failed to load from CDN, falling back to bundled data:',
      caught,
    );
    return { songs: await loadBundled(), from: 'bundled' };
  }
};

let hydration: Promise<void> | null = null;

export const ensureSongContent = (): Promise<void> => {
  hydration ??= loadSongs().then(({ songs, from }) => {
    for (const key of Object.keys(SONGS)) delete SONGS[key];
    Object.assign(SONGS, songs);
    source = from;
    songGeneration += 1;
  });

  return hydration;
};

export const isSongContentReady = (): boolean => songGeneration > 0;

/** Test seam — resets to the pre-hydration state. */
export const resetSongContent = () => {
  for (const key of Object.keys(SONGS)) delete SONGS[key];
  hydration = null;
  source = null;
  songGeneration = 0;
};

// ── Accessors ───────────────────────────────────────────────────────────────
// Unchanged signatures, re-exported through @/curriculum/data/songs so no
// consumer had to move.

export function getSong(id: string): Song | null {
  return SONGS[id] ?? null;
}

export function getAllSongs(): Song[] {
  return Object.values(SONGS);
}

export function getSongsByGenre(genre: string): Song[] {
  return getAllSongs().filter((s) => s.genreTags.includes(genre));
}

export function getSongsByDifficulty(level: DifficultyLevel): Song[] {
  return getAllSongs().filter((s) => s.difficulty === level);
}

export function getSongsByGlobeRegion(region: string): Song[] {
  return getAllSongs().filter((s) =>
    s.origin?.region?.toLowerCase().includes(region.toLowerCase()),
  );
}

export function getSongsByGlobeEra(era: string): Song[] {
  return getAllSongs().filter((s) => s.origin?.era === era);
}

export function getSongsByArtist(artist: string): Song[] {
  return getAllSongs().filter((s) =>
    s.artist.toLowerCase().includes(artist.toLowerCase()),
  );
}
