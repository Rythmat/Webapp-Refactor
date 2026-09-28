import { describe, expect, it } from 'vitest';
import { midiNameInKey } from '@prism/engine';
import { buildScore } from '@/lib/notation';

/**
 * The staff behind the chord popup's Notation toggle. A song chord is four
 * notes or fewer, so it belongs on ONE clef (the project's chord/clef rule),
 * and it is spelled in the key it sounds in so the staff and the note pills
 * cannot disagree.
 */

const chordScore = (midi: number[], keyTonicPc?: number, mode?: string) =>
  buildScore(
    midi.map((m, i) => ({
      id: `n${i}`,
      midi: m,
      startTick: 0,
      durationTicks: 1920,
      ...(keyTonicPc == null
        ? {}
        : { name: midiNameInKey(m, keyTonicPc, mode) }),
    })),
    {
      staves: 'treble',
      minMeasures: 1,
      timeSignature: [4, 4],
      ...(keyTonicPc == null ? {} : { keyTonicPc }),
    },
  );

describe('the chord popup staff', () => {
  it('keeps a four-note chord on one clef', () => {
    const score = chordScore([60, 64, 67, 71], 0, 'ionian');
    expect(score.staves).toEqual(['treble']);
  });

  it('takes its key signature from the song, not from the notes', () => {
    // G major: one sharp. The chord itself is plain G-B-D.
    expect(chordScore([67, 71, 74], 7, 'ionian').keyFifths).toBe(1);
    // A♭ major: four flats.
    expect(chordScore([68, 72, 75], 8, 'ionian').keyFifths).toBe(-4);
  });

  it('spells a chord in the key it sounds in', () => {
    // The ♭7 of A♭ is written G♭, never F♯.
    expect(midiNameInKey(66, 8, 'ionian')).toMatch(/^Gb/);
    // In G, the same pitch is F♯.
    expect(midiNameInKey(66, 7, 'ionian')).toMatch(/^F#/);
  });
});
