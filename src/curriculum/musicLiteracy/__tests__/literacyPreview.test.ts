import { describe, expect, it } from 'vitest';
import { voicedChord } from '@/curriculum/engine/musicLiteracy/chords';
import { tonicMidi } from '@/curriculum/engine/musicLiteracy/pitch';
import { keyPreviewNotes, progressionPreview } from '../literacyPreview';

/**
 * Hearing a choice: a key's 1, 3 and 5 sit where its melodies will, in the
 * treble staff; a progression is voiced as its chords always are.
 */

const pitches = (tonic: 'C' | 'G' | 'A' | 'B' | 'F#', minor = false) =>
  keyPreviewNotes({ tonic, mode: minor ? 'minor' : 'major' })
    .slice(0, 3)
    .map((n) => n.midi);

describe('hearing a key', () => {
  it('plays its 1, 3 and 5 from the lowest 1 that keeps them in the staff', () => {
    expect(pitches('C')).toEqual([60, 64, 67]);
    expect(pitches('G')).toEqual([67, 71, 74]);
    expect(pitches('A', true)).toEqual([69, 72, 76]);
    expect(pitches('B')).toEqual([71, 75, 78]);
    expect(pitches('F#', true)).toEqual([66, 69, 73]);
  });

  it('then strikes the three together', () => {
    const notes = keyPreviewNotes({ tonic: 'G', mode: 'major' });
    expect(notes.slice(3).map((n) => [n.midi, n.onset])).toEqual([
      [67, 720],
      [71, 720],
      [74, 720],
    ]);
  });
});

describe('hearing a progression', () => {
  it('voices its chords as the lesson plays them, roots in D3–C♯4', () => {
    const key = { tonic: 'G', mode: 'major' } as const;
    const chords = (['1', '4'] as const).map(
      (degree) => voicedChord(key, degree, 'triads')!,
    );
    const { notes } = progressionPreview(chords, tonicMidi('G'));
    expect(notes.slice(0, 3).map((n) => n.midi)).toEqual([55, 59, 62]);
  });
});
