import { describe, expect, it } from 'vitest';
import {
  buildChordToneContext,
  cadenceTargets,
  endsWithValidCadence,
  respectsIntervalCap,
  selectConstrainedContours,
  type MelodyLevel,
} from '../melodyConstraints';

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
  MODE_STEPS[mode].map((s) => rootMidi + s);

// D dorian: D E F G A B C. Tonic triad D F A.
const D_DORIAN = scaleFor('dorian', 62);
const ctx = buildChordToneContext(D_DORIAN)!;
const [D, E, F, G, A, B, C] = [62, 64, 65, 67, 69, 71, 72];

/** Degrees as a player names them, for readable expectations. */
const names = new Map<number, string>([
  [D - 12, 'D3'],
  [E - 12, 'E3'],
  [F - 12, 'F3'],
  [G - 12, 'G3'],
  [A - 12, 'A3'],
  [B - 12, 'B3'],
  [C - 12, 'C4'],
  [D, 'D4'],
  [E, 'E4'],
  [F, 'F4'],
  [G, 'G4'],
  [A, 'A4'],
  [B, 'B4'],
  [C, 'C5'],
  [D + 12, 'D5'],
  [E + 12, 'E5'],
  [F + 12, 'F5'],
  [G + 12, 'G5'],
  [A + 12, 'A5'],
  [B + 12, 'B5'],
  [C + 12, 'C6'],
]);
const spell = (midis: number[]) =>
  midis.map((m) => names.get(m) ?? String(m)).sort();

describe('cadence targets by second-to-last note (D dorian)', () => {
  it('5 resolves to the 1 above or the 1 below', () => {
    expect(spell(cadenceTargets(A, ctx))).toEqual(['D4', 'D5']);
  });

  it('4 resolves up to the 5, down to the 3, or down to the lower 1', () => {
    expect(spell(cadenceTargets(G, ctx))).toEqual(['A4', 'D4', 'F4']);
  });

  it('3 resolves to the 1 below or leaps a 6th to the 1 above', () => {
    expect(spell(cadenceTargets(F, ctx))).toEqual(['D4', 'D5']);
  });

  it('2 resolves down to the 1 or up to the 3', () => {
    expect(spell(cadenceTargets(E, ctx))).toEqual(['D4', 'F4']);
  });

  it('6 falls to the 5 or rises a 3rd to the 1', () => {
    expect(spell(cadenceTargets(B, ctx))).toEqual(['A4', 'D5']);
  });

  it('7 rises to the 1 or falls a 3rd to the 5', () => {
    expect(spell(cadenceTargets(C, ctx))).toEqual(['A4', 'D5']);
  });

  it('1 repeats, or moves to the 3 or the 5', () => {
    expect(spell(cadenceTargets(D, ctx))).toEqual(['A3', 'A4', 'D4', 'F4']);
  });

  it('never permits a leap past a 5th except the 3 rising to the 1', () => {
    // Scale steps, not semitones: four steps is a 5th in any mode.
    const stepOf = (midi: number) => {
      const idx = ctx.degreeRing.findIndex((m) => m % 12 === midi % 12);
      return Math.round((midi - ctx.degreeRing[idx]) / 12) * 7 + idx;
    };
    const exceptions: string[] = [];
    for (const penultimate of ctx.degreeRing) {
      for (const target of cadenceTargets(penultimate, ctx)) {
        const steps = Math.abs(stepOf(target) - stepOf(penultimate));
        if (steps > 4) {
          exceptions.push(
            `${names.get(penultimate)}->${names.get(target)} (${steps} steps)`,
          );
        }
      }
    }
    // Exactly one: the 3 rising a 6th (five steps) to the 1.
    expect(exceptions).toEqual(['F4->D5 (5 steps)']);
    expect(D + 12 - F).toBe(9); // a major 6th up, in semitones
  });
});

describe('endsWithValidCadence', () => {
  it('accepts the resolutions the table allows', () => {
    expect(endsWithValidCadence([F, E, D], ctx)).toBe(true); // 2 -> 1
    expect(endsWithValidCadence([D, E, F], ctx)).toBe(true); // 2 -> 3
    expect(endsWithValidCadence([D, G, A], ctx)).toBe(true); // 4 -> 5
    expect(endsWithValidCadence([D, G, F], ctx)).toBe(true); // 4 -> 3
    expect(endsWithValidCadence([F, A, D], ctx)).toBe(true); // 5 -> 1 below
    expect(endsWithValidCadence([F, A, D + 12], ctx)).toBe(true); // 5 -> 1 above
    expect(endsWithValidCadence([A, F, D], ctx)).toBe(true); // 3 -> 1 below
    expect(endsWithValidCadence([A, F, D + 12], ctx)).toBe(true); // 3 -> 1 above
  });

  it('rejects a 4 rising a 5th to the upper 1', () => {
    // The 4 may fall to the lower 1 only; the upper 1 is explicitly excluded.
    expect(cadenceTargets(G, ctx)).not.toContain(D + 12);
    expect(endsWithValidCadence([F, G, D + 12], ctx)).toBe(false);
  });

  it('rejects a 5 that does not reach the 1', () => {
    expect(endsWithValidCadence([D, A, F], ctx)).toBe(false); // 5 -> 3
  });

  it('rejects a 2 that leaps past its neighbours', () => {
    expect(endsWithValidCadence([D, E, A], ctx)).toBe(false); // 2 -> 5
  });

  it('rejects landing on a non-chord tone', () => {
    expect(endsWithValidCadence([D, F, E], ctx)).toBe(false);
    expect(endsWithValidCadence([D, F, B], ctx)).toBe(false);
  });

  it('falls back to the chord-tone rule for a single note', () => {
    expect(endsWithValidCadence([F], ctx)).toBe(true);
    expect(endsWithValidCadence([E], ctx)).toBe(false);
  });
});

describe('the diminished 5 falls to the 3', () => {
  // B locrian: 1=B ♭2=C ♭3=D 4=E ♭5=F ♭6=G ♭7=A
  const loc = buildChordToneContext(scaleFor('locrian', 71))!;

  it('resolves ♭5 down a 3rd to the ♭3 instead of a tritone to the 1', () => {
    expect(loc.diminishedFifth).toBe(true);
    const targets = cadenceTargets(77, loc); // F5, the ♭5
    expect(targets).toEqual([74]); // D5, the ♭3
    expect(targets).not.toContain(71); // not B, a tritone below
    expect(targets).not.toContain(83); // not B, a tritone above
  });

  it('leaves modes with a perfect 5th alone', () => {
    expect(buildChordToneContext(scaleFor('dorian', 62))!.diminishedFifth).toBe(
      false,
    );
    expect(buildChordToneContext(scaleFor('lydian', 65))!.diminishedFifth).toBe(
      false,
    );
  });
});

describe('interval caps by level', () => {
  const octaveLeap = [D, D + 12, F, D]; // an octave inside the phrase
  const tenthLeap = [F, F - 12, A, D]; // wider than an octave

  it('level 1 caps every interval at a 5th', () => {
    expect(respectsIntervalCap([D, F, A, D + 12], ctx, 1)).toBe(true);
    expect(respectsIntervalCap(octaveLeap, ctx, 1)).toBe(false);
    expect(respectsIntervalCap(tenthLeap, ctx, 1)).toBe(false);
  });

  it('level 2 allows up to an octave inside the phrase', () => {
    expect(respectsIntervalCap(octaveLeap, ctx, 2)).toBe(true);
    expect(respectsIntervalCap(tenthLeap, ctx, 2)).toBe(false);
  });

  it('level 3 caps only the closing interval', () => {
    expect(respectsIntervalCap(octaveLeap, ctx, 3)).toBe(true);
    expect(respectsIntervalCap(tenthLeap, ctx, 3)).toBe(true);
  });

  it('allows the 3 to rise a 6th at the close, at every level', () => {
    const sixthClose = [A, F, D + 12];
    ([1, 2, 3] as MelodyLevel[]).forEach((level) => {
      expect(respectsIntervalCap(sixthClose, ctx, level)).toBe(true);
      expect(endsWithValidCadence(sixthClose, ctx)).toBe(true);
    });
  });
});

describe('selectConstrainedContours honours the cadence and the level', () => {
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
    [5, 4, 3, 2, 1],
    [3, 4, 5, 4, 3, 2, 1],
  ];

  it('every returned phrase cadences correctly, in every mode and key', () => {
    ([1, 2, 3] as MelodyLevel[]).forEach((level) => {
      Object.keys(MODE_STEPS).forEach((mode) => {
        for (let root = 60; root < 72; root += 1) {
          const scale = scaleFor(mode, root);
          const modeCtx = buildChordToneContext(scale)!;
          const seqs = selectConstrainedContours(POOL, scale, 3, level);
          expect(seqs.length).toBeGreaterThanOrEqual(2);
          seqs.forEach((seq) => {
            expect(endsWithValidCadence(seq, modeCtx)).toBe(true);
          });
        }
      });
    });
  });

  it('respects the level cap on the phrases it selects', () => {
    ([1, 2, 3] as MelodyLevel[]).forEach((level) => {
      Object.keys(MODE_STEPS).forEach((mode) => {
        const scale = scaleFor(mode, 62);
        const modeCtx = buildChordToneContext(scale)!;
        selectConstrainedContours(POOL, scale, 3, level).forEach((seq) => {
          expect(respectsIntervalCap(seq, modeCtx, level)).toBe(true);
        });
      });
    });
  });

  it('keeps the combined two-contour phrase valid end to end', () => {
    ([1, 2, 3] as MelodyLevel[]).forEach((level) => {
      for (let run = 0; run < 20; run += 1) {
        const seqs = selectConstrainedContours(POOL, D_DORIAN, 3, level);
        const combined = [...seqs[0], ...seqs[1]];
        // The phrase's cadence is the tail's cadence.
        expect(endsWithValidCadence(combined, ctx)).toBe(true);
        if (level !== 3) {
          // The join between contours must not leap past the level's cap.
          expect(respectsIntervalCap(combined, ctx, level)).toBe(true);
        }
      }
    });
  });

  it('still repairs a hostile pool into a valid cadence', () => {
    const seqs = selectConstrainedContours(
      [
        [2, 2, 2],
        [2, 2],
      ],
      D_DORIAN,
      3,
      1,
    );
    expect(seqs.length).toBeGreaterThan(0);
    seqs.forEach((seq) => expect(endsWithValidCadence(seq, ctx)).toBe(true));
  });
});
