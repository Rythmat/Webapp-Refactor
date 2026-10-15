import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ensureSongContent,
  isSongContentReady,
  resetSongContent,
} from './songStore';

/**
 * A hydration that failed outright (no CDN, and the bundled songs' chunk
 * didn't load either) is tried again by the next caller, as the Studio's
 * Retry on a song link does (milestone 1.12a). It used to stay rejected for
 * the life of the page.
 */

const bundled = vi.hoisted(() => ({ fail: true }));

vi.mock('@/curriculum/data/songs/bundled', () => ({
  get BUNDLED_SONGS() {
    if (bundled.fail) throw new TypeError('Failed to fetch');
    return { a: { id: 'a', title: 'A' } };
  },
}));

describe('songStore after a failed hydration', () => {
  beforeEach(() => {
    resetSongContent();
    bundled.fail = true;
  });

  it('tries again on the next call', async () => {
    await expect(ensureSongContent()).rejects.toThrow('Failed to fetch');
    expect(isSongContentReady()).toBe(false);

    bundled.fail = false;
    await expect(ensureSongContent()).resolves.toBeUndefined();
    expect(isSongContentReady()).toBe(true);
  });
});
