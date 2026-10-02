import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Where the importer reads and writes, relative to this file rather than
 * spelled out absolutely (as `enrichSongYears.mjs` did), so it runs from any
 * checkout.
 */

export const ENRICHMENT_DIR = fileURLToPath(new URL('..', import.meta.url));

/** Gitignored: raw responses and stage outputs derived from local-only inputs. */
export const CACHE_DIR = join(ENRICHMENT_DIR, '_cache');
export const HTTP_CACHE_DIR = join(CACHE_DIR, 'http');
export const CACHE_MANIFEST = join(CACHE_DIR, 'manifest.json');
export const CACHE_STAGE_OUT = join(CACHE_DIR, 'stage-cache.json');
export const FETCH_STAGE_OUT = join(CACHE_DIR, 'stage-fetch.json');
/** `score`'s account for people: every artist's tier, pick and notes. */
export const SCORE_STAGE_OUT = join(CACHE_DIR, 'stage-score.json');
/** `fetch --only songs`'s account for people: what each song's walk found. */
export const SONG_FETCH_OUT = join(CACHE_DIR, 'stage-songs.json');
/** `score --only songs`'s account: every song's match and why. */
export const SONG_SCORE_OUT = join(CACHE_DIR, 'stage-score-songs.json');
/** Held by a running fetch, so a second one refuses to start beside it. */
export const FETCH_LOCK = join(CACHE_DIR, 'fetch.lock');

/**
 * The code the cache stage runs, hashed into its output's fingerprint: a fix
 * to its matching makes the old output stale just as new inputs do.
 */
export const CACHE_STAGE_CODE = [
  fileURLToPath(new URL('./cacheStage.ts', import.meta.url)),
  fileURLToPath(new URL('../../../content/graph/slugs.ts', import.meta.url)),
] as const;

/** Read-only inputs left by `enrichSongYears.mjs` (gitignored, local-only). */
export const MB_CACHE = join(ENRICHMENT_DIR, '_mb_cache.json');
export const YEAR_AUDIT = join(ENRICHMENT_DIR, '_year_audit.json');
export const YEAR_MISSES = join(ENRICHMENT_DIR, '_year_misses.json');
export const LOCAL_INPUTS = [MB_CACHE, YEAR_AUDIT, YEAR_MISSES] as const;

/** The committed artifacts `emit` writes. */
export const SUGGESTIONS_DIR = join(ENRICHMENT_DIR, 'suggestions');
/** The owner's hand-labelled sample (committed: the labels are the owner's work). */
export const CALIBRATION_DIR = join(ENRICHMENT_DIR, 'calibration');
export const CALIBRATION_FILE = join(CALIBRATION_DIR, 'artists-100.json');

/** Where each artist's songs are pinned on the globe (repo data, read-only). */
export const ARTIST_LOCATIONS = fileURLToPath(
  new URL('../../artistLocations.json', import.meta.url),
);
