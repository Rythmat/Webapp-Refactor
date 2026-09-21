import { describe, expect, it } from 'vitest';
import { MELODY_CONTOURS } from '@/daw/prism-engine/data/melodyContours';
import {
  buildChordToneContext,
  endsWithValidCadence,
  hasRequiredChordTones,
  respectsIntervalCap,
  selectMelodyPhrases,
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
const scaleFor = (mode: string, root: number) =>
  MODE_STEPS[mode].map((s) => root + s);

/** The real library the lesson draws from. */
const POOL = Object.values(MELODY_CONTOURS).flat();
const D_DORIAN = scaleFor('dorian', 62);
const LEVELS: MelodyLevel[] = [1, 2, 3];
const same = (a: number[], b: number[]) =>
  a.length === b.length && a.every((n, i) => n === b[i]);

describe('selectMelodyPhrases', () => {
  it('gives the lesson three phrases', () => {
    const phrases = selectMelodyPhrases(POOL, D_DORIAN, 1)!;
    expect(phrases.short.length).toBeGreaterThan(0);
    expect(phrases.long.length).toBeGreaterThan(0);
    expect(phrases.articulation.length).toBeGreaterThan(0);
  });

  it('never repeats a phrase across an In Time activity', () => {
    // short (acts 1-2), long (3-4) and articulation (5-7) must all differ,
    // which is the whole point: a phrase the student has played in time is
    // never heard again.
    for (let run = 0; run < 100; run += 1) {
      const { short, long, articulation } = selectMelodyPhrases(
        POOL,
        D_DORIAN,
        1,
      )!;
      expect(same(short, long)).toBe(false);
      expect(same(short, articulation)).toBe(false);
      expect(same(long, articulation)).toBe(false);
    }
  });

  it('builds the long phrase from new material, not the short one', () => {
    for (let run = 0; run < 100; run += 1) {
      const { short, long } = selectMelodyPhrases(POOL, D_DORIAN, 1)!;
      // The long phrase must not simply open with the short phrase.
      expect(same(long.slice(0, short.length), short)).toBe(false);
    }
  });

  it('makes the long phrase longer than the short one', () => {
    for (let run = 0; run < 30; run += 1) {
      const { short, long } = selectMelodyPhrases(POOL, D_DORIAN, 1)!;
      expect(long.length).toBeGreaterThan(short.length);
    }
  });

  it('holds every phrase to all three rules, in every mode and level', () => {
    LEVELS.forEach((level) => {
      Object.keys(MODE_STEPS).forEach((mode) => {
        for (let root = 60; root < 72; root += 1) {
          const scale = scaleFor(mode, root);
          const ctx = buildChordToneContext(scale)!;
          const phrases = selectMelodyPhrases(POOL, scale, level)!;
          expect(phrases).not.toBeNull();

          [phrases.short, phrases.long, phrases.articulation].forEach(
            (phrase) => {
              expect(hasRequiredChordTones(phrase, ctx)).toBe(true);
              expect(endsWithValidCadence(phrase, ctx)).toBe(true);
              expect(respectsIntervalCap(phrase, ctx, level)).toBe(true);
              // Playable on the lesson keyboard: an octave below the root to
              // two above. Joining two contours must not push a phrase out.
              expect(Math.min(...phrase)).toBeGreaterThanOrEqual(root - 12);
              expect(Math.max(...phrase)).toBeLessThanOrEqual(root + 24);
            },
          );
        }
      });
    });
  });

  it('returns null only when there is nothing to work with', () => {
    expect(selectMelodyPhrases([], D_DORIAN, 1)).toBeNull();
    expect(selectMelodyPhrases(POOL, [60, 62, 64], 1)).toBeNull();
  });

  it('still produces phrases from a pool with a single usable contour', () => {
    const ctx = buildChordToneContext(D_DORIAN)!;
    const phrases = selectMelodyPhrases([[1, 2, 3]], D_DORIAN, 1)!;
    expect(phrases).not.toBeNull();
    [phrases.short, phrases.long, phrases.articulation].forEach((phrase) => {
      expect(phrase.length).toBeGreaterThan(0);
      expect(endsWithValidCadence(phrase, ctx)).toBe(true);
    });
  });

  it('varies the phrases it draws from run to run', () => {
    const seen = new Set<string>();
    for (let run = 0; run < 30; run += 1) {
      seen.add(selectMelodyPhrases(POOL, D_DORIAN, 2)!.short.join(','));
    }
    expect(seen.size).toBeGreaterThan(5);
  });
});

describe('the 4 over a major tonic', () => {
  // Learn's mode lessons play over one chord: the mode's own tonic triad.
  // Ionian and mixolydian have a major 3rd and a perfect 4, so the rule binds.
  // Lydian raises its 4, and the minor modes have no major 3rd.
  const MAJOR_TONIC_MODES = ['ionian', 'mixolydian'];
  const LEVELS: MelodyLevel[] = [1, 2, 3];

  const unresolvedFourths = (phrase: number[], root: number) => {
    const bad: number[] = [];
    phrase.forEach((midi, i) => {
      const degree = (((midi - root) % 12) + 12) % 12;
      if (degree !== 5) return;
      const next = phrase[i + 1];
      const resolves =
        next !== undefined && (((next - root) % 12) + 12) % 12 === 4;
      if (!resolves) bad.push(i);
    });
    return bad;
  };

  it('never leaves a 4 unresolved in a major-tonic mode', () => {
    LEVELS.forEach((level) => {
      MAJOR_TONIC_MODES.forEach((mode) => {
        for (let root = 60; root < 72; root += 1) {
          const scale = scaleFor(mode, root);
          const phrases = selectMelodyPhrases(POOL, scale, level)!;
          [phrases.short, phrases.long, phrases.articulation].forEach(
            (phrase) => {
              expect(unresolvedFourths(phrase, root)).toEqual([]);
            },
          );
        }
      });
    });
  });

  it('still leaves the 4 free in the minor modes', () => {
    // Nothing here should be constrained — a dorian melody may use its 4
    // anywhere, and the pool is rich enough that some phrase will.
    let sawFreeFourth = false;
    for (let run = 0; run < 60; run += 1) {
      const scale = scaleFor('dorian', 62);
      const { short, long, articulation } = selectMelodyPhrases(
        POOL,
        scale,
        3,
      )!;
      for (const phrase of [short, long, articulation]) {
        if (unresolvedFourths(phrase, 62).length > 0) sawFreeFourth = true;
      }
    }
    expect(sawFreeFourth).toBe(true);
  });

  it('repairs a hostile pool rather than giving up', () => {
    // Every contour is the 4 repeated — in C ionian that is F, with nowhere
    // to resolve, so repair has to rewrite it.
    const scale = scaleFor('ionian', 60);
    const phrases = selectMelodyPhrases(
      [
        [4, 4, 4],
        [4, 4],
      ],
      scale,
      1,
    )!;
    [phrases.short, phrases.long, phrases.articulation].forEach((phrase) => {
      expect(unresolvedFourths(phrase, 60)).toEqual([]);
    });
  });
});
