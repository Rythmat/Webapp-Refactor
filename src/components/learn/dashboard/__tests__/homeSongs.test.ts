import { describe, expect, it } from 'vitest';
import type { Song } from '@/curriculum/types/songLibrary';
import { homeSongs } from '../homeSongs';

const song = (id: string, popularity = 0) =>
  ({
    id,
    title: id,
    artist: 'A',
    popularity,
    genreTags: [],
  }) as unknown as Song;

describe('Home’s Songs column', () => {
  const songs = [song('a', 1), song('b', 9), song('c', 5), song('d', 7)];

  it('leads with the songs they came back to, newest first, then picks, then the best known', () => {
    const rows = homeSongs({
      songs,
      savedAt: { a: 10 },
      viewedAt: { c: 30, a: 5 },
      picked: [song('c'), song('d')],
      limit: 4,
    });
    expect(rows.map((r) => [r.song.id, r.why])).toEqual([
      ['c', 'back'],
      ['a', 'saved'],
      ['d', 'picked'],
      ['b', 'popular'],
    ]);
  });

  it('skips songs the library no longer holds, and stops at the limit', () => {
    const rows = homeSongs({
      songs,
      savedAt: { gone: 99 },
      viewedAt: {},
      picked: [],
      limit: 2,
    });
    expect(rows.map((r) => r.song.id)).toEqual(['b', 'd']);
  });
});
