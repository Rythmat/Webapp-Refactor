import { describe, expect, it } from 'vitest';
import { buildHitIndex } from '../model/hitTest';

/**
 * The dot under the pointer: the closest centre among the dots whose own
 * radius reaches the point, checked against a brute-force search.
 */

describe('nearest', () => {
  const xy = new Float32Array([0, 0, 100, 0, 0, 100]);
  const index = buildHitIndex(xy, new Float32Array([8, 8, 8]));

  it('finds the nearest centre', () => {
    expect(index.nearest(90, 0)).toBe(1);
    expect(index.nearest(-5, 80)).toBe(2);
  });

  it('finds nothing beyond the distance asked', () => {
    expect(index.nearest(50, 50, 10)).toBe(-1);
    expect(index.nearest(60, 0, 50)).toBe(1);
  });
});

describe('hit', () => {
  // A big dot at the origin and a small one just beside it.
  const xy = new Float32Array([0, 0, 35, 0]);
  const radii = new Float32Array([30, 8]);
  const index = buildHitIndex(xy, radii);

  it('picks the closest centre among the dots that reach the point', () => {
    // Both reach (28, 0): the small dot's centre is closer.
    expect(index.hit(28, 0)).toBe(1);
  });

  it('finds a big dot even when a small dot’s centre is closer', () => {
    // At (20, 0) the small centre is 15 away, past its radius of 8.
    expect(index.nearest(20, 0)).toBe(1);
    expect(index.hit(20, 0)).toBe(0);
  });

  it('finds nothing where no dot reaches', () => {
    expect(index.hit(0, 40)).toBe(-1);
    expect(index.hit(44, 0)).toBe(-1);
  });

  it('scales the radii, and adds the slack', () => {
    // At half size the big dot reaches 15 and the small one 4.
    expect(index.hit(20, 0, 0.5)).toBe(-1);
    expect(index.hit(14, 0, 0.5)).toBe(0);
    // Six units of slack bring the small dot's reach to 10.
    expect(index.hit(35, 9.5, 0.5, 6)).toBe(1);
  });

  it('breaks a tie the same way every time', () => {
    const twins = buildHitIndex(new Float32Array([0, 0, 10, 0]), [8, 8]);
    expect(twins.hit(5, 0)).toBe(0);
  });
});

describe('the index', () => {
  it('skips nodes not placed yet', () => {
    const index = buildHitIndex(
      new Float32Array([Number.NaN, Number.NaN, 5, 5]),
      [8, 8],
    );
    expect(index.size).toBe(1);
    expect(index.hit(0, 0)).toBe(1);
    expect(index.nearest(-100, -100)).toBe(1);
  });

  it('answers nothing when empty', () => {
    const index = buildHitIndex(new Float32Array(0), new Float32Array(0));
    expect(index.size).toBe(0);
    expect(index.hit(0, 0)).toBe(-1);
    expect(index.nearest(0, 0)).toBe(-1);
  });

  it('keeps its own copy of the positions', () => {
    const xy = new Float32Array([0, 0, 50, 50]);
    const index = buildHitIndex(xy, [8, 8]);
    xy[0] = 500;
    xy[1] = 500;
    expect(index.hit(0, 0)).toBe(0);
  });

  it('agrees with a brute-force search over many dots', () => {
    // A seeded generator, so the dots are the same every run.
    let seed = 42;
    const random = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 2 ** 32;
    };
    const count = 2000;
    const xy = new Float32Array(count * 2);
    const radii = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      xy[2 * i] = random() * 4000 - 2000;
      xy[2 * i + 1] = random() * 4000 - 2000;
      radii[i] = 8 + random() * 22;
    }
    const index = buildHitIndex(xy, radii);
    const brute = (x: number, y: number, scale: number) => {
      let best = -1;
      let bestDistance = Infinity;
      for (let i = 0; i < count; i++) {
        const d = (xy[2 * i] - x) ** 2 + (xy[2 * i + 1] - y) ** 2;
        const r = radii[i] * scale;
        if (d <= r * r && d < bestDistance) {
          best = i;
          bestDistance = d;
        }
      }
      return best;
    };
    let hits = 0;
    for (let q = 0; q < 400; q++) {
      const x = random() * 4000 - 2000;
      const y = random() * 4000 - 2000;
      const scale = q % 2 ? 1 : 2.5;
      const expected = brute(x, y, scale);
      expect(index.hit(x, y, scale)).toBe(expected);
      if (expected >= 0) hits++;
    }
    // The queries really did land on dots, not only on empty space.
    expect(hits).toBeGreaterThan(20);
  });
});
