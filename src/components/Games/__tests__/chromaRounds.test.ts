import { describe, expect, it } from 'vitest';
import {
  CHROMA_FRESH,
  CHROMA_INTERVALS,
  CHROMA_ROOT,
  intervalLabel,
  pickIntervals,
  roundNotes,
} from '../chromaRounds';

describe('Chroma’s intervals', () => {
  it('runs unison through octave, all within one octave of the root', () => {
    expect(CHROMA_INTERVALS.map((iv) => iv.semitones)).toEqual([
      0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12,
    ]);
    expect(intervalLabel(0, 'words')).toBe('Perfect Unison');
    expect(intervalLabel(12, 'words')).toBe('Octave');
  });

  it('names them by number: 4, ♭3, ♯4, 8', () => {
    expect(intervalLabel(5, 'numbers')).toBe('4');
    expect(intervalLabel(3, 'numbers')).toBe('♭3');
    expect(intervalLabel(6, 'numbers')).toBe('♯4');
    expect(intervalLabel(12, 'numbers')).toBe('8');
    expect(CHROMA_INTERVALS.map((iv) => iv.number)).toEqual([
      '1',
      '♭2',
      '2',
      '♭3',
      '3',
      '4',
      '♯4',
      '5',
      '♭6',
      '6',
      '♭7',
      '7',
      '8',
    ]);
  });
});

describe('a Chroma round', () => {
  it('asks for as many intervals as its level, no two alike', () => {
    for (const level of [1, 2, 3] as const) {
      for (let seed = 0; seed < 20; seed++) {
        let n = seed;
        const random = () => (n = (n * 9301 + 49297) % 233280) / 233280;
        const picked = pickIntervals(level, random);
        expect(picked).toHaveLength(level);
        expect(new Set(picked).size).toBe(level);
        for (const s of picked) expect(s >= 0 && s <= 12).toBe(true);
      }
    }
  });

  it('never brings an interval back until six others have been heard', () => {
    for (const level of [1, 2, 3] as const) {
      for (let seed = 1; seed < 30; seed++) {
        let n = seed;
        const random = () => (n = (n * 9301 + 49297) % 233280) / 233280;
        const heard: number[] = [];
        for (let round = 0; round < 40; round++)
          heard.push(...pickIntervals(level, random, heard));
        for (let i = 0; i < heard.length; i++) {
          const window = heard.slice(Math.max(0, i - CHROMA_FRESH), i);
          expect(window, `level ${level} seed ${seed} at ${i}`).not.toContain(
            heard[i],
          );
        }
      }
    }
  });

  it('plays the root before every interval note, and the root never moves', () => {
    // Root – Perfect 4th, Root – Octave, Root – Minor 6th.
    expect(roundNotes([5, 12, 8]).map((n) => n.midi)).toEqual([
      CHROMA_ROOT,
      CHROMA_ROOT + 5,
      CHROMA_ROOT,
      CHROMA_ROOT + 12,
      CHROMA_ROOT,
      CHROMA_ROOT + 8,
    ]);
    expect(
      roundNotes([5, 12, 8])
        .filter((n) => n.isRoot)
        .every((n) => n.midi === CHROMA_ROOT),
    ).toBe(true);
  });
});
