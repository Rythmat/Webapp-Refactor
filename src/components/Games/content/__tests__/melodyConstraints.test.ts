import { describe, expect, it } from 'vitest';
import {
  buildChordToneContext,
  endsOnChordTone,
  hasRequiredChordTones,
  nearestChordTone,
  resolveContour,
  selectConstrainedContours,
} from '../melodyConstraints';

// Mirrors buildScaleMidis in LessonContainer: root..octave inclusive.
const MODE_STEPS: Record<string, number[]> = {
  ionian: [0, 2, 4, 5, 7, 9, 11, 12],
  dorian: [0, 2, 3, 5, 7, 9, 10, 12],
  phrygian: [0, 1, 3, 5, 7, 8, 10, 12],
  lydian: [0, 2, 4, 6, 7, 9, 11, 12],
  mixolydian: [0, 2, 4, 5, 7, 9, 10, 12],
  aeolian: [0, 2, 3, 5, 7, 8, 10, 12],
  locrian: [0, 1, 3, 5, 6, 8, 10, 12],
};

const scaleFor = (mode: string, rootMidi: number) =>
  MODE_STEPS[mode].map((step) => rootMidi + step);

const D4 = 62;
// D dorian: D E F G A B C (D). Tonic triad D F A.
const D_DORIAN = scaleFor('dorian', D4);
const D = 62;
const E = 64;
const F = 65;
const G = 67;
const A = 69;
const B = 71;

describe('buildChordToneContext', () => {
  it('strips the octave duplicate and picks degrees 1, 3, 5', () => {
    const ctx = buildChordToneContext(D_DORIAN)!;
    expect(ctx.degreeRing).toHaveLength(7);
    expect(ctx.degreeRing[0]).toBe(D);
    // D dorian triad: D (2), F (5), A (9)
    expect([...ctx.chordTonePcs].sort((a, b) => a - b)).toEqual([2, 5, 9]);
    expect(ctx.thirdPc).toBe(F % 12);
  });

  it('uses the major third in a major mode', () => {
    const ctx = buildChordToneContext(scaleFor('lydian', 65))!; // F lydian
    expect(ctx.thirdPc).toBe(69 % 12); // A
  });

  it('uses the diminished fifth in locrian', () => {
    const ctx = buildChordToneContext(scaleFor('locrian', 71))!; // B locrian
    // B locrian triad: B (11), D (2), F (5)
    expect([...ctx.chordTonePcs].sort((a, b) => a - b)).toEqual([2, 5, 11]);
  });

  it('returns null for a scale too small to stack a triad', () => {
    expect(buildChordToneContext([60, 62, 64])).toBeNull();
    expect(buildChordToneContext([])).toBeNull();
  });
});

describe('resolveContour', () => {
  const ring = buildChordToneContext(D_DORIAN)!.degreeRing;

  it('maps 1-based degrees onto the scale', () => {
    expect(resolveContour([1, 2, 3], ring)).toEqual([D, E, F]);
    expect(resolveContour([3, 2, 3], ring)).toEqual([F, E, F]);
  });

  it('wraps degrees past the octave instead of dropping them', () => {
    // Previously [1,3,5,10] lost its last note (index 9 past an 8-entry scale).
    // Degree 10 is degree 3 an octave up: F5.
    expect(resolveContour([1, 3, 5, 10], ring)).toEqual([D, F, A, F + 12]);
    // Degrees 9 and 13 are E5 and B5 — both were dropped before.
    expect(resolveContour([1, 5, 9, 13], ring)).toEqual([D, A, E + 12, B + 12]);
  });

  it('never drops a note, for every contour length', () => {
    for (let len = 3; len <= 8; len += 1) {
      const contour = Array.from({ length: len }, (_, i) => (i % 14) + 1);
      expect(resolveContour(contour, ring)).toHaveLength(len);
    }
  });

  it('continues the degree ladder below the root instead of discarding it', () => {
    // 0 is one step below the root (the 7th, an octave down), -1 two steps.
    // The old mapper dropped 0 entirely and landed -1 back on the root.
    expect(resolveContour([0, 1, 2], ring)).toEqual([72 - 12, D, E]); // C4 D E
    expect(resolveContour([-1, 1, 3], ring)).toEqual([B - 12, D, F]); // B3 D F
  });

  it('preserves interval shape under transposition', () => {
    const contour = [1, 3, 5, 4, 2];
    const shape = (seq: number[]) => seq.slice(1).map((n, i) => n - seq[i]);
    const base = shape(resolveContour(contour, ring, 0));
    for (let t = 1; t < ring.length; t += 1) {
      // Same scale steps, so the semitone sizes shift, but direction and
      // step-count must match.
      const moved = resolveContour(contour, ring, t);
      expect(moved).toHaveLength(contour.length);
      expect(shape(moved).map(Math.sign)).toEqual(base.map(Math.sign));
    }
  });
});

describe('rule 1 — two chord tones including the 3', () => {
  const ctx = buildChordToneContext(D_DORIAN)!;

  it('rejects the reported F - E - F', () => {
    expect(hasRequiredChordTones([F, E, F], ctx)).toBe(false);
  });

  it('accepts the corrected melodies', () => {
    expect(hasRequiredChordTones([F, E, D], ctx)).toBe(true); // 3 + 1
    expect(hasRequiredChordTones([D, E, F], ctx)).toBe(true); // 1 + 3
    expect(hasRequiredChordTones([F, G, A], ctx)).toBe(true); // 3 + 5
    expect(hasRequiredChordTones([A, E, F], ctx)).toBe(true); // 5 + 3
    expect(hasRequiredChordTones([D, F, A], ctx)).toBe(true); // 1 + 3 + 5
  });

  it('rejects two chord tones that omit the 3', () => {
    expect(hasRequiredChordTones([D, E, A], ctx)).toBe(false); // 1 + 5, no 3
  });

  it('rejects a melody with no chord tones', () => {
    expect(hasRequiredChordTones([E, G, B], ctx)).toBe(false);
  });

  it('counts octave-displaced chord tones', () => {
    expect(hasRequiredChordTones([F - 12, E, D + 12], ctx)).toBe(true);
  });
});

describe('rule 2 — final note is a chord tone', () => {
  const ctx = buildChordToneContext(D_DORIAN)!;

  it('accepts phrases ending on 1, 3 or 5', () => {
    expect(endsOnChordTone([E, G, D], ctx)).toBe(true);
    expect(endsOnChordTone([E, G, F], ctx)).toBe(true);
    expect(endsOnChordTone([E, G, A], ctx)).toBe(true);
  });

  it('rejects phrases ending on a non-chord tone', () => {
    expect(endsOnChordTone([D, F, E], ctx)).toBe(false);
    expect(endsOnChordTone([D, F, B], ctx)).toBe(false);
  });

  it('accepts an octave-displaced final chord tone', () => {
    expect(endsOnChordTone([E, G, D + 12], ctx)).toBe(true);
    expect(endsOnChordTone([E, G, A - 12], ctx)).toBe(true);
  });

  it('rejects an empty phrase', () => {
    expect(endsOnChordTone([], ctx)).toBe(false);
  });
});

describe('nearestChordTone', () => {
  const ctx = buildChordToneContext(D_DORIAN)!;

  it('leaves a chord tone alone', () => {
    expect(nearestChordTone(F, ctx)).toBe(F);
  });

  it('snaps to the closest, breaking ties downward', () => {
    expect(nearestChordTone(E, ctx)).toBe(F); // E is 2 above D, 1 below F
    expect(nearestChordTone(B, ctx)).toBe(A); // B is 2 above A, 3 below D
    expect(nearestChordTone(G, ctx)).toBe(F); // tie: 2 from F, 2 from A
  });

  it('stays in the note’s own register', () => {
    expect(Math.abs(nearestChordTone(B, ctx) - B)).toBeLessThanOrEqual(3);
  });
});

describe('selectConstrainedContours', () => {
  // A pool of plain absolute-degree contours, lengths 3-8, including values
  // past the octave as the real library has.
  const POOL: number[][] = [
    [3, 2, 3],
    [2, 2, 2],
    [1, 2, 3],
    [5, 4, 2],
    [2, 4, 6],
    [1, 3, 5, 7],
    [7, 6, 5, 4],
    [1, 2, 3, 4, 5],
    [1, 3, 5, 10],
    [1, 5, 9, 13],
    [4, 3, 2, 1, 2, 3],
    [2, 4, 6, 8, 6, 4, 2],
    [1, 2, 3, 4, 5, 6, 7, 8],
  ];

  it('never returns the reported F - E - F for D dorian', () => {
    const ctx = buildChordToneContext(D_DORIAN)!;
    for (let run = 0; run < 50; run += 1) {
      const seqs = selectConstrainedContours([[3, 2, 3]], D_DORIAN, 3);
      seqs.forEach((seq) => {
        expect(endsOnChordTone(seq, ctx)).toBe(true);
        expect(hasRequiredChordTones(seq, ctx)).toBe(true);
      });
    }
  });

  it('satisfies both rules across every mode and key', () => {
    Object.keys(MODE_STEPS).forEach((mode) => {
      for (let rootMidi = 60; rootMidi < 72; rootMidi += 1) {
        const scale = scaleFor(mode, rootMidi);
        const ctx = buildChordToneContext(scale)!;
        const seqs = selectConstrainedContours(POOL, scale, 3);

        expect(seqs.length).toBeGreaterThanOrEqual(2);
        seqs.forEach((seq) => {
          expect(seq.length).toBeGreaterThan(0);
          expect(endsOnChordTone(seq, ctx)).toBe(true);
        });
        // Slot 0 is played alone as a complete phrase, so it carries rule 1.
        expect(hasRequiredChordTones(seqs[0], ctx)).toBe(true);
      }
    });
  });

  it('keeps melodies inside a playable range', () => {
    Object.keys(MODE_STEPS).forEach((mode) => {
      const scale = scaleFor(mode, D4);
      const drawn = Array.from({ length: 25 }, () =>
        selectConstrainedContours(POOL, scale, 3),
      ).flat();
      drawn.forEach((seq) => {
        expect(Math.max(...seq) - Math.min(...seq)).toBeLessThanOrEqual(24);
        expect(Math.min(...seq)).toBeGreaterThanOrEqual(scale[0] - 12);
        expect(Math.max(...seq)).toBeLessThanOrEqual(scale[0] + 24);
      });
    });
  });

  it('repairs when nothing in the pool can fit', () => {
    const ctx = buildChordToneContext(D_DORIAN)!;
    // Every contour is a static repeat of degree 2 (E) — no transposition of a
    // one-degree contour can produce two distinct chord tones.
    const hostile = [
      [2, 2, 2],
      [2, 2],
    ];
    const seqs = selectConstrainedContours(hostile, D_DORIAN, 3);
    expect(seqs.length).toBeGreaterThan(0);
    seqs.forEach((seq) => {
      expect(endsOnChordTone(seq, ctx)).toBe(true);
    });
  });

  it('returns an empty list for an empty pool', () => {
    expect(selectConstrainedContours([], D_DORIAN, 3)).toEqual([]);
  });

  it('falls back to plain resolution for a scale with no usable triad', () => {
    const seqs = selectConstrainedContours([[1, 2, 3]], [60, 62, 64], 3);
    expect(seqs.length).toBeGreaterThan(0);
    expect(seqs[0]).toHaveLength(3);
  });
});
