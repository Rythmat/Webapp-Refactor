import { describe, expect, it } from 'vitest';
import { voicedProgression } from '@/curriculum/engine/musicLiteracy/chords';
import { tonicMidi } from '@/curriculum/engine/musicLiteracy/pitch';
import { keyPreviewNotes, progressionPreview } from '../literacyPreview';

/**
 * Hearing a choice: a key's 1, 3 and 5 sit where its melodies will, in the
 * treble staff with the fewest ledger lines; a progression is voiced as the
 * steps that play it will voice it.
 */

const pitches = (tonic: 'C' | 'G' | 'A' | 'B' | 'F#', minor = false) =>
  keyPreviewNotes({ tonic, mode: minor ? 'minor' : 'major' })
    .slice(0, 3)
    .map((n) => n.midi);

describe('hearing a key', () => {
  it('plays its 1, 3 and 5 where they need the fewest ledger lines, in the staff', () => {
    // C5 E5 G5: middle C would need a line.
    expect(pitches('C')).toEqual([72, 76, 79]);
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
  it('voices its chords as the lesson plays them, together', () => {
    const key = { tonic: 'G', mode: 'major' } as const;
    // G4 B4 D5, then up a 4th to C5 E5 G5: both in the staff.
    const chords = voicedProgression(key, ['1', '4'], 'triads');
    const { notes } = progressionPreview(chords, tonicMidi('G'));
    expect(notes.map((n) => n.midi)).toEqual([67, 71, 74, 72, 76, 79]);
  });
});
