import { describe, expect, it } from 'vitest';
import type { Song } from '@/curriculum/types/songLibrary';
import { songGuitarLessonRoute, songLessonRoute } from '../songLessonRoute';

// The lesson routes read only the song's key and mode.
const song = (key: string, mode: Song['mode']) => ({ key, mode }) as Song;

describe('a song’s lesson', () => {
  it('opens the piano lesson in the song’s key', () => {
    expect(songLessonRoute(song('B♭ major', 'major'))).toBe(
      '/learn/ionian/bflat',
    );
    // C stays the free lesson ('c', never 'c major').
    expect(songLessonRoute(song('C major', 'major'))).toBe('/learn/ionian/c');
    expect(songLessonRoute(song('A minor', 'minor'))).toBe('/learn/aeolian/a');
  });

  it('opens the guitar lesson on guitar', () => {
    expect(songGuitarLessonRoute(song('C major', 'major'))).toBe(
      '/learn/guitar/ionian/c',
    );
    expect(songGuitarLessonRoute(song('E♭ dorian', 'dorian'))).toBe(
      '/learn/guitar/dorian/eflat',
    );
    expect(songGuitarLessonRoute(song('C♯ minor', 'minor'))).toBe(
      '/learn/guitar/aeolian/csharp',
    );
    expect(songGuitarLessonRoute(song('G mixolydian', 'mixolydian'))).toBe(
      '/learn/guitar/mixolydian/g',
    );
  });
});
