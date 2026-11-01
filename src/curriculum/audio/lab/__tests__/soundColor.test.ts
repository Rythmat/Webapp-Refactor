import { describe, expect, it } from 'vitest';
import {
  envelopeLevel,
  safeEnvelope,
  shapeNamed,
  SHAPES,
} from '../physics/envelope';
import {
  recipeAt,
  recipeNamed,
  recipeOf,
  recipePeak,
  RECIPES,
} from '../physics/harmonics';
import {
  fundamentalHz,
  modeHz,
  modesOf,
  nodesOf,
  OPEN_STRING_HZ,
  standingAt,
  stringHz,
} from '../physics/standing';
import { centsBetween } from '../physics/wave';

describe('standing waves', () => {
  it('raises a string one octave at half its length', () => {
    expect(stringHz(1)).toBe(OPEN_STRING_HZ);
    expect(stringHz(1 / 2)).toBe(OPEN_STRING_HZ * 2);
  });

  it('puts the fifth and the fourth where the frets are', () => {
    expect(centsBetween(stringHz(2 / 3), OPEN_STRING_HZ)).toBeCloseTo(702, 0);
    expect(centsBetween(stringHz(3 / 4), OPEN_STRING_HZ)).toBeCloseTo(498, 0);
  });

  it('puts a closed pipe an octave below an open one of the same length', () => {
    expect(fundamentalHz('flute') / fundamentalHz('clarinet')).toBeCloseTo(2);
  });

  it('rings a closed pipe at odd harmonics only', () => {
    expect(modesOf('clarinet').every((n) => n % 2 === 1)).toBe(true);
    expect(modesOf('flute')).toContain(2);
    expect(modeHz('clarinet', 3)).toBeCloseTo(fundamentalHz('clarinet') * 3);
  });

  it('holds a string still at both ends', () => {
    for (const n of modesOf('string')) {
      expect(standingAt('string', n, 0)).toBeCloseTo(0);
      expect(standingAt('string', n, 1)).toBeCloseTo(0);
    }
  });

  it('moves a pipe’s air most at an open end, not at all at a closed one', () => {
    for (const n of modesOf('flute')) {
      expect(Math.abs(standingAt('flute', n, 0))).toBeCloseTo(1);
      expect(Math.abs(standingAt('flute', n, 1))).toBeCloseTo(1);
    }
    for (const n of modesOf('clarinet')) {
      expect(standingAt('clarinet', n, 0)).toBeCloseTo(0);
      expect(Math.abs(standingAt('clarinet', n, 1))).toBeCloseTo(1);
    }
  });

  it('marks still points exactly where each pattern doesn’t move', () => {
    for (const source of ['string', 'flute', 'clarinet'] as const) {
      for (const n of modesOf(source)) {
        for (const u of nodesOf(source, n)) {
          expect(standingAt(source, n, u)).toBeCloseTo(0);
          expect(u).toBeGreaterThanOrEqual(0);
          expect(u).toBeLessThanOrEqual(1);
        }
      }
    }
  });
});

describe('harmonic recipes', () => {
  it('repeats just as often whatever harmonics are added', () => {
    for (const { harmonics } of RECIPES) {
      for (const at of [0.1, 0.37, 0.8]) {
        expect(recipeAt(at + 1, harmonics)).toBeCloseTo(
          recipeAt(at, harmonics),
        );
      }
    }
  });

  it('gives the hollow recipe odd harmonics only', () => {
    recipeNamed('hollow').harmonics.forEach((amount, i) => {
      if (i % 2 === 1) expect(amount).toBe(0);
    });
  });

  it('scales a stack back to a peak of 1', () => {
    const { harmonics } = recipeNamed('bright');
    const peak = recipePeak(harmonics);
    expect(peak).toBeGreaterThan(1);
    for (let i = 0; i < 200; i++) {
      expect(Math.abs(recipeAt(i / 200, harmonics) / peak)).toBeLessThanOrEqual(
        1.0001,
      );
    }
  });

  it('builds a recipe from the harmonics chosen, each at 1/n', () => {
    expect(recipeOf(new Set([1, 3]), 4)).toEqual([1, 0, 1 / 3, 0]);
  });
});

describe('envelopes', () => {
  const env = { attack: 1, decay: 1, sustain: 0.5, release: 1 };

  it('climbs, settles and holds', () => {
    expect(envelopeLevel(0, env)).toBe(0);
    expect(envelopeLevel(0.5, env)).toBeCloseTo(0.5);
    expect(envelopeLevel(1, env)).toBeCloseTo(1);
    expect(envelopeLevel(1.5, env)).toBeCloseTo(0.75);
    expect(envelopeLevel(100, env)).toBeCloseTo(0.5);
  });

  it('releases from the level it had reached', () => {
    expect(envelopeLevel(3.5, env, 3)).toBeCloseTo(0.25);
    expect(envelopeLevel(4, env, 3)).toBe(0);
    // Let go during the attack: from there, not from the peak.
    expect(envelopeLevel(0.5, env, 0.5)).toBeCloseTo(0.5);
    expect(envelopeLevel(1, env, 0.5)).toBeCloseTo(0.25);
  });

  it('keeps every change slow enough not to click', () => {
    const safe = safeEnvelope({ attack: 0, decay: 0, sustain: 2, release: 0 });
    expect(safe.attack).toBeGreaterThan(0);
    expect(safe.release).toBeGreaterThan(0);
    expect(safe.sustain).toBe(1);
  });

  it('offers shapes that end differently and start differently', () => {
    expect(shapeNamed('pluck').envelope.sustain).toBe(0);
    expect(shapeNamed('held').envelope.sustain).toBe(1);
    expect(shapeNamed('swell').envelope.attack).toBeGreaterThan(0.5);
    expect(new Set(SHAPES.map((s) => s.id)).size).toBe(4);
  });
});
