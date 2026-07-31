import { beforeEach, describe, expect, it } from 'vitest';
import { getAllSongs, getSong } from '@/curriculum/data/songs';
import {
  ensureSongContent,
  isSongContentReady,
  resetSongContent,
  SONGS,
  songContentSource,
} from './songStore';

/**
 * Same contract as contentStore.test.ts, for the song library.
 *
 * The regression these guard against is silent: SONGS is filled by mutating a
 * stable object, so a module-scope `const ALL = getAllSongs()` anywhere in the
 * app captures an empty library and that surface renders nothing forever. The
 * first test fails the moment such a snapshot is reintroduced.
 */
/**
 * Hydrating from the bundled fallback pulls in 640 song modules through a
 * dynamic import. That comfortably exceeds vitest's 5s default when the whole
 * suite is running and workers are competing for CPU — it is slow test setup,
 * not slow product code (in production this is one gzipped CDN fetch).
 */
const HYDRATION_TIMEOUT = 60_000;

describe('songStore hydration contract', () => {
  beforeEach(() => {
    resetSongContent();
  });

  it('SONGS is empty before hydration', () => {
    expect(Object.keys(SONGS)).toHaveLength(0);
    expect(isSongContentReady()).toBe(false);
    // The public accessors must agree — they are what consumers actually call.
    expect(getAllSongs()).toHaveLength(0);
    expect(getSong('africa')).toBeNull();
  });

  it(
    'hydrates from bundled data when no CDN is configured',
    async () => {
      await ensureSongContent();

      expect(songContentSource()).toBe('bundled');
      expect(getAllSongs().length).toBeGreaterThan(600);
      expect(isSongContentReady()).toBe(true);
    },
    HYDRATION_TIMEOUT,
  );

  it(
    'keeps object identity stable across hydration',
    async () => {
      const before = SONGS;
      await ensureSongContent();
      expect(SONGS).toBe(before);
    },
    HYDRATION_TIMEOUT,
  );

  it(
    'resolves a known song through the public accessor',
    async () => {
      await ensureSongContent();

      const song = getSong('africa');
      expect(song).not.toBeNull();
      expect(song?.title).toBeTruthy();
      expect(song?.artist).toBeTruthy();
      expect(Array.isArray(song?.sections)).toBe(true);
    },
    HYDRATION_TIMEOUT,
  );

  it(
    'carries popularity, which browse order depends on',
    async () => {
      await ensureSongContent();

      // staticIndex.ts sorts the browse view by popularity-desc. If the published
      // bundle ever drops the field, ordering silently degrades to insertion
      // order with no error anywhere.
      const withPopularity = getAllSongs().filter(
        (song) => typeof song.popularity === 'number',
      );
      expect(withPopularity.length).toBeGreaterThan(0);
    },
    HYDRATION_TIMEOUT,
  );

  it(
    'hydrates only once for concurrent callers',
    async () => {
      await Promise.all([
        ensureSongContent(),
        ensureSongContent(),
        ensureSongContent(),
      ]);

      expect(Object.keys(SONGS)).toHaveLength(getAllSongs().length);
    },
    HYDRATION_TIMEOUT,
  );
});
