/**
 * Chord identity: guitar chords are judged by pitch-class set, so voicing,
 * octave and detector label ambiguity never fail a correct chord.
 */

import { describe, expect, it } from 'vitest';
import { shapeLowestMidi, shapePitchClasses } from '@/lib/guitar/fretboard';
import {
  IDENTITY_MATCH,
  IDENTITY_PASS,
  chordIdentityScore,
  chordPcs,
  chordToneDiagnostics,
  describeChordTone,
  identifyChordFromPitchClasses,
  nearestChordForPitchClasses,
  pitchClassName,
} from '../chordIdentity';

const BOOK_QUALITIES = [
  'major',
  'minor',
  'major7',
  'minor7',
  'dominant7',
  'minor7b5',
] as const;

const chord = (rootPc: number, quality: string) => ({
  rootPc,
  pcs: chordPcs(rootPc, quality),
});

describe('chordPcs', () => {
  it('spells a chord from the CHORDS table, root first', () => {
    expect(chordPcs(0, 'major')).toEqual([0, 4, 7]);
    expect(chordPcs(9, 'minor7')).toEqual([9, 0, 4, 7]);
    expect(chordPcs(11, 'minor7b5')).toEqual([11, 2, 5, 9]);
  });

  it('is empty for an unknown quality', () => {
    expect(chordPcs(0, 'not-a-chord')).toEqual([]);
  });
});

describe('chordIdentityScore', () => {
  const C = chord(0, 'major');
  const Cmaj7 = chord(0, 'major7');

  it('scores equal sets 1 whatever the label (Am7 = C6, Bm7♭5 = Dm6)', () => {
    expect(chordIdentityScore(chord(9, 'minor7'), chord(0, 'major6'))).toBe(1);
    expect(chordIdentityScore(chord(11, 'minor7b5'), chord(2, 'minor6'))).toBe(
      1,
    );
  });

  it('scores a strummed open C against a C major target 1', () => {
    const openC = 'X-3-2-0-1-0'; // C3 E3 G3 C4 E4
    const played = {
      pcs: shapePitchClasses(openC),
      rootPc: shapeLowestMidi(openC) % 12,
    };
    expect(chordIdentityScore(C, played)).toBe(1);
    // A barre C at the 8th fret, a different voicing of the same chord.
    expect(
      chordIdentityScore(C, {
        pcs: shapePitchClasses('8-10-10-9-8-8'),
        rootPc: 0,
      }),
    ).toBe(1);
  });

  it('scores a maj7 missing its 7th 0.8 — a pass', () => {
    expect(chordIdentityScore(Cmaj7, { pcs: [0, 4, 7], rootPc: 0 })).toBe(0.8);
    expect(IDENTITY_PASS).toBe(0.8);
  });

  it('scores the target plus one ringing open string 0.6 — a match, not a pass', () => {
    const withOpenD = { pcs: [0, 4, 7, 2], rootPc: 0 };
    expect(chordIdentityScore(C, withOpenD)).toBe(0.6);
    expect(IDENTITY_MATCH).toBe(0.6);
  });

  it('scores other partial chords 0.6', () => {
    // Rootless: Em inside Cmaj7.
    expect(chordIdentityScore(Cmaj7, chord(4, 'minor'))).toBe(0.6);
    // Two notes, root included (a power chord).
    expect(chordIdentityScore(C, { pcs: [0, 7], rootPc: 0 })).toBe(0.6);
  });

  it('scores unrelated sets, two extras and single notes 0', () => {
    expect(chordIdentityScore(C, chord(2, 'minor'))).toBe(0);
    expect(chordIdentityScore(C, { pcs: [0, 4, 7, 2, 9], rootPc: 0 })).toBe(0);
    expect(chordIdentityScore(C, { pcs: [0], rootPc: 0 })).toBe(0);
    expect(chordIdentityScore(C, { pcs: [], rootPc: 0 })).toBe(0);
  });
});

describe('identifyChordFromPitchClasses', () => {
  it('names every book quality in every key when the root is in the bass', () => {
    for (const quality of BOOK_QUALITIES) {
      for (let root = 0; root < 12; root++) {
        expect(
          identifyChordFromPitchClasses(chordPcs(root, quality), root),
        ).toEqual({ rootPc: root, quality });
      }
    }
  });

  it('names every book quality by prior when no bass is given', () => {
    for (const quality of BOOK_QUALITIES) {
      expect(identifyChordFromPitchClasses(chordPcs(2, quality))).toEqual({
        rootPc: 2,
        quality,
      });
    }
  });

  it('prefers the name rooted on the bass', () => {
    const am7 = [9, 0, 4, 7];
    expect(identifyChordFromPitchClasses(am7, 9)).toEqual({
      rootPc: 9,
      quality: 'minor7',
    });
    expect(identifyChordFromPitchClasses(am7, 0)).toEqual({
      rootPc: 0,
      quality: 'major6',
    });
    // Bass on neither candidate root: the more common quality wins.
    expect(identifyChordFromPitchClasses(am7, 4)).toEqual({
      rootPc: 9,
      quality: 'minor7',
    });
  });

  it('ignores octaves and duplicates', () => {
    expect(identifyChordFromPitchClasses([48, 52, 55, 60, 64], 48)).toEqual({
      rootPc: 0,
      quality: 'major',
    });
  });

  it('is null for a set no detectable chord matches', () => {
    expect(identifyChordFromPitchClasses([0, 1, 2])).toBeNull();
  });
});

describe('nearestChordForPitchClasses', () => {
  it('finds the chord a stray note was added to', () => {
    expect(nearestChordForPitchClasses([0, 4, 6, 7], 0)).toEqual({
      rootPc: 0,
      quality: 'major',
    });
  });

  it('roots a two-note fragment on the bass', () => {
    expect(nearestChordForPitchClasses([0, 4], 0)).toEqual({
      rootPc: 0,
      quality: 'major',
    });
  });

  it('is null when nothing is close', () => {
    expect(nearestChordForPitchClasses([0, 1, 2], 0)).toBeNull();
  });
});

describe('chordToneDiagnostics', () => {
  it('lists missing and extra tones from played pitch classes', () => {
    expect(chordToneDiagnostics([0, 4, 7], 0, [0, 7, 2])).toEqual({
      missingPcs: [4],
      extraPcs: [2],
    });
  });

  it('reads a chroma, counting bins at a quarter of the loudest', () => {
    const chroma = new Float64Array(12);
    chroma[0] = 0.8;
    chroma[7] = 0.5;
    chroma[4] = 0.1; // below 0.2: not heard
    chroma[5] = 0.3; // an extra F
    expect(chordToneDiagnostics([0, 4, 7], 0, chroma)).toEqual({
      missingPcs: [4],
      extraPcs: [5],
    });
  });

  it('orders tones up from the root', () => {
    expect(
      chordToneDiagnostics(chordPcs(9, 'minor'), 9, new Float64Array(12)),
    ).toEqual({ missingPcs: [9, 0, 4], extraPcs: [] });
  });
});

describe('describeChordTone', () => {
  it('names the degree and spells the tone from the root', () => {
    expect(describeChordTone(8, 4, 69)).toBe('the 3 (G♯)'); // E in A
    expect(describeChordTone(4, 4, 69)).toBe('the root (E)');
    expect(describeChordTone(0, 9, 60)).toBe('the ♭3 (C)'); // Am in C
    expect(describeChordTone(5, 7, 60)).toBe('the ♭7 (F)'); // G7 in C
    expect(describeChordTone(11, 0, 60)).toBe('the 7 (B)'); // Cmaj7 in C
  });

  it('spells in the key: flats in F and D♭, sharps in F♯', () => {
    expect(describeChordTone(10, 10, 65)).toBe('the root (B♭)');
    expect(describeChordTone(8, 5, 61)).toBe('the ♭3 (A♭)'); // Fm in D♭
    expect(describeChordTone(5, 5, 66)).toBe('the root (E♯)'); // E♯m7♭5 in F♯
    expect(describeChordTone(11, 5, 66)).toBe('the ♭5 (B)');
  });

  it('keeps a borrowed chord spelled from its own root', () => {
    expect(describeChordTone(8, 4, 60)).toBe('the 3 (G♯)'); // E major in C
  });
});

describe('pitchClassName', () => {
  it('spells a pitch class for the key', () => {
    expect(pitchClassName(10, 65)).toBe('B♭');
    expect(pitchClassName(5, 66)).toBe('E♯');
    expect(pitchClassName(5, 0)).toBe('F');
  });
});
