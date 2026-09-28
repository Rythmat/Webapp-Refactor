/**
 * The determinism core, held to output captured from the live upstream page.
 *
 * These assertions are exact (`toBe`, not `toBeCloseTo`). The engine's correctness criterion is
 * bit-identical output, and a port that is merely close is a port that is wrong — a one-ulp drift
 * in the first rng draw moves every fleck, dot and contour in the picture.
 *
 * If this goes red after a formatting pass, the formatter changed the arithmetic. See
 * src/core/rng.ts for the precedence note.
 */
import { describe, expect, it } from 'vitest';
import { hash, mulberry32, rngFor } from '../rng.ts';
import { wobbler } from '../wobble.ts';
import golden from './core.golden.json' with { type: 'json' };
import { ulpDiff } from './ulp.ts';

const draws = (r: () => number, n: number): number[] =>
  Array.from({ length: n }, () => r());

describe('golden fixture', () => {
  it('came from the pinned upstream commit', () => {
    expect(golden._upstream).toBe('64826c4f172b0d8322453b9a4eb20ee5fe73dfdf');
  });
});

describe('hash (FNV-1a)', () => {
  it.each(Object.entries(golden.hash))(
    'hash(%j) matches upstream',
    (key, expected) => {
      expect(hash(key)).toBe(expected);
    },
  );

  it('returns an unsigned 32-bit value', () => {
    for (const key of Object.keys(golden.hash)) {
      const h = hash(key);
      expect(Number.isInteger(h)).toBe(true);
      expect(h).toBeGreaterThanOrEqual(0);
      expect(h).toBeLessThanOrEqual(0xffffffff);
    }
  });

  it('seeds the empty key with the FNV offset basis', () => {
    expect(hash('')).toBe(2166136261);
  });
});

describe('mulberry32', () => {
  it.each(Object.entries(golden.mulberry32))(
    'seed %s produces upstream draws',
    (seed, expected) => {
      expect(draws(mulberry32(Number(seed)), expected.length)).toEqual(
        expected,
      );
    },
  );

  it('stays in [0, 1)', () => {
    const r = mulberry32(0x6d2b79f5);
    for (let i = 0; i < 10000; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('rngFor', () => {
  it.each(Object.entries(golden.rngFor))(
    'key %j produces upstream draws',
    (key, expected) => {
      expect(draws(rngFor(key), expected.length)).toEqual(expected);
    },
  );

  it('is a pure function of the key — two generators agree', () => {
    expect(draws(rngFor('weight:stone'), 32)).toEqual(
      draws(rngFor('weight:stone'), 32),
    );
  });

  it('separates keys that differ by one character', () => {
    expect(draws(rngFor('flame:bed'), 4)).not.toEqual(
      draws(rngFor('flame:bee'), 4),
    );
  });
});

describe('wobbler', () => {
  const at = [0, 0.5, 1, 2, Math.PI, 6.283185307179586, -1.25];

  /* Asserted in ULPs rather than exactly: the fixture was captured in SpiderMonkey and this runs
     in V8, and the two disagree in the last bit of Math.sin for some arguments. See ./ulp.ts.
     8 ULPs is ~1e-16 here — an algebraic mistake would show up thousands of times larger. */
  const MAX_ULP = 8;

  it.each(Object.entries(golden.wobbler))(
    'key %j matches upstream',
    (key, expected) => {
      for (const [harmonics, want] of [
        [3, expected.h3],
        [5, expected.h5],
      ] as const) {
        const got = at.map((t) => wobbler(key, harmonics)(t));
        got.forEach((v, i) => {
          expect(
            ulpDiff(v, want[i]),
            `h${harmonics} th=${at[i]}: ${v} vs ${want[i]}`,
          ).toBeLessThanOrEqual(MAX_ULP);
        });
      }
    },
  );

  it('is periodic in 2pi, so a ring closes without a seam', () => {
    const w = wobbler('flame:cut');
    for (const th of [0, 0.7, 2.4, -1.1]) {
      expect(w(th + Math.PI * 2)).toBeCloseTo(w(th), 12);
    }
  });
});
