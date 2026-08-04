import { describe, expect, it } from 'vitest';
import type { AudioSource } from '@/curriculum/types/songLibrary';
import {
  buildKeyString,
  getYouTubeUri,
  isValidYouTubeUrl,
  keyRootForPitchClass,
  makeEmptySong,
  noteName,
  slugify,
  upsertYouTubeUri,
} from './songDefaults';

describe('key helpers', () => {
  it('builds a display key string from keyRoot + mode', () => {
    expect(buildKeyString(67, 'major')).toBe('G major');
    expect(buildKeyString(62, 'minor')).toBe('D minor');
    expect(buildKeyString(70, 'major')).toBe('B♭ major');
  });

  it('maps a pitch class to a C4-octave keyRoot and back', () => {
    expect(keyRootForPitchClass(7)).toBe(67);
    expect(noteName(keyRootForPitchClass(7))).toBe('G');
  });
});

describe('slugify', () => {
  it('produces a url-safe id from a title', () => {
    expect(slugify("(Sittin' On) The Dock Of The Bay")).toBe(
      'sittin_on_the_dock_of_the_bay',
    );
    expect(slugify('  Hello, World!  ')).toBe('hello_world');
  });
});

describe('youtube source helpers', () => {
  const base: AudioSource[] = [{ provider: 'spotify', uri: 'spotify:track:x' }];

  it('reads the current youtube uri', () => {
    expect(getYouTubeUri(base)).toBe('');
    expect(
      getYouTubeUri([
        ...base,
        { provider: 'youtube', uri: 'https://youtu.be/abcdefghijk' },
      ]),
    ).toBe('https://youtu.be/abcdefghijk');
  });

  it('upserts one youtube source, preserving other providers and startOffsetSec', () => {
    const withYt: AudioSource[] = [
      { provider: 'youtube', uri: 'old', startOffsetSec: 12 },
      ...base,
    ];
    const next = upsertYouTubeUri(
      withYt,
      'https://youtube.com/watch?v=abcdefghijk',
    );
    expect(next).toHaveLength(2);
    expect(next[0]).toEqual({
      provider: 'youtube',
      uri: 'https://youtube.com/watch?v=abcdefghijk',
      startOffsetSec: 12,
    });
    expect(next.some((s) => s.provider === 'spotify')).toBe(true);
  });

  it('removes the youtube source when the url is cleared', () => {
    const withYt: AudioSource[] = [
      { provider: 'youtube', uri: 'old' },
      ...base,
    ];
    expect(upsertYouTubeUri(withYt, '   ')).toEqual(base);
  });

  it('validates a youtube url', () => {
    expect(isValidYouTubeUrl('https://youtube.com/watch?v=abcdefghijk')).toBe(
      true,
    );
    expect(isValidYouTubeUrl('https://youtu.be/abcdefghijk')).toBe(true);
    expect(isValidYouTubeUrl('https://example.com/nope')).toBe(false);
    expect(isValidYouTubeUrl('')).toBe(false);
  });
});

describe('makeEmptySong', () => {
  it('starts with one blank-label, 4-bar section', () => {
    const song = makeEmptySong();
    expect(song.sections).toHaveLength(1);
    expect(song.sections[0].label).toBe('');
    expect(song.sections[0].bars).toHaveLength(4);
    expect(song.sections[0].bars.every((b) => b.chords.length === 0)).toBe(
      true,
    );
    expect(song.audioSources).toEqual([]);
    expect(song.timeSignature).toEqual([4, 4]);
    expect(song.artistImageSource).toBe('none');
    expect(song.mode).toBe('major');
  });
});
