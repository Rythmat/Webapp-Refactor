import { describe, expect, it } from 'vitest';
import type { Song } from '@/curriculum/types/songLibrary';
import {
  artistRows,
  byTitle,
  easySongs,
  genreRows,
  popularSongs,
  songsInGenre,
} from '../exploreShelves';

const song = (id: string, title: string, extra: Partial<Song> = {}): Song =>
  ({
    id,
    title,
    artist: 'Someone',
    difficulty: 2,
    genreTags: ['pop'],
    popularity: 50,
    ...extra,
  }) as Song;

const SONGS = [
  song('a', 'The Zebra', { popularity: 90, difficulty: 1 }),
  song('b', 'Apple', { popularity: 40, genreTags: ['funk'] }),
  song('c', 'Mango', { popularity: 70, difficulty: 1, genreTags: ['funk'] }),
  song('d', 'Kiwi', { popularity: undefined, genreTags: ['funk', 'funk'] }),
  song('e', 'Banana', { popularity: 70, genreTags: ['rock'] }),
];

const GENRES = [
  { value: 'all', label: 'All Genres' },
  { value: 'pop', label: 'Pop' },
  { value: 'rock', label: 'Rock' },
  { value: 'funk', label: 'Funk' },
];

describe('Explore’s song shelves', () => {
  it('sorts by title with "The" set aside', () => {
    expect(byTitle(SONGS).map((s) => s.id)).toEqual(['b', 'e', 'd', 'c', 'a']);
  });

  it('puts the best-known first, ties in a fixed order', () => {
    const top = popularSongs(SONGS, 3).map((s) => s.id);
    expect(top[0]).toBe('a');
    expect(new Set(top.slice(1))).toEqual(new Set(['e', 'c']));
    expect(popularSongs(SONGS, 3).map((s) => s.id)).toEqual(top);
  });

  it('keeps easy songs to level 1', () => {
    expect(easySongs(SONGS).map((s) => s.id)).toEqual(['a', 'c']);
  });

  it('lists a genre’s songs, best-known first', () => {
    expect(songsInGenre(SONGS, 'funk').map((s) => s.id)).toEqual([
      'c',
      'b',
      'd',
    ]);
  });

  it('offers the genres with enough songs, in the list’s order', () => {
    expect(genreRows(SONGS, GENRES, 2)).toEqual([
      { slug: 'funk', label: 'Funk', count: 3 },
    ]);
    expect(genreRows(SONGS, GENRES, 1).map((g) => g.slug)).toEqual([
      'pop',
      'rock',
      'funk',
    ]);
  });

  it('groups an artist’s songs whatever the name’s capitals, "The" aside A–Z', () => {
    const rows = artistRows([
      song('x', 'One', { artist: 'Ace Of Base', popularity: 10 }),
      song('y', 'Two', { artist: 'Ace of Base', popularity: 80 }),
      song('z', 'Three', { artist: 'Ace of Base', popularity: 30 }),
      song('w', 'Four', { artist: 'The Beatles' }),
    ]);
    expect(rows.map((row) => row.name)).toEqual(['Ace of Base', 'The Beatles']);
    expect(rows[0].key).toBe('ace of base');
    // The best-known first.
    expect(rows[0].songs.map((s) => s.id)).toEqual(['y', 'z', 'x']);
  });
});
