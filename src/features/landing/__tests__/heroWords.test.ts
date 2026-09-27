import { describe, expect, it } from 'vitest';
import { LOGO, turnBetween, type Curve } from '../motion/lissajous';
import { HERO_WORDS } from '../sections/heroWords';

const TAU = 2 * Math.PI;
const N = 720;
const point = ({ ratio: [a, b], phase }: Curve, t: number) =>
  [Math.sin(a * t), Math.sin(b * t - phase)] as const;

/**
 * How far a curve is from retracing itself: a retraced (flat) figure runs back
 * over its own path, p(t0 + s) = p(t0 − s), about some t0. 0 means flat.
 */
const openness = (curve: Curve) => {
  let least = Infinity;
  for (let i = 0; i < 2 * N; i++) {
    const t0 = (Math.PI * i) / N;
    let most = 0;
    for (let j = 1; j < N; j += 7) {
      const s = (TAU * j) / N;
      const [x1, y1] = point(curve, t0 + s);
      const [x2, y2] = point(curve, t0 - s);
      most = Math.max(most, Math.hypot(x1 - x2, y1 - y2));
    }
    least = Math.min(least, most);
  }
  return least;
};

describe('hero words', () => {
  it('opens on Music Atlas, the only word with the logo', () => {
    expect(HERO_WORDS[0].text).toBe('Music Atlas');
    expect(HERO_WORDS[0].curve).toEqual(LOGO);
    for (const { text, curve } of HERO_WORDS.slice(1)) {
      expect(curve.ratio, text).not.toEqual(LOGO.ratio);
    }
  });

  it('gives every word its own curve', () => {
    const keys = HERO_WORDS.map(
      ({ curve: { ratio, phase } }) =>
        `${ratio.join(':')}@${(((phase % TAU) + TAU) % TAU).toFixed(3)}`,
    );
    expect(new Set(keys).size).toBe(HERO_WORDS.length);
    expect(new Set(HERO_WORDS.map((w) => w.text)).size).toBe(HERO_WORDS.length);
  });

  it('can tell a flat figure from an open one', () => {
    // 1:2 at a quarter turn is the parabola, and 1:1 at phase 0 a diagonal line.
    expect(openness({ ratio: [1, 2], phase: Math.PI / 2 })).toBeLessThan(0.05);
    expect(openness({ ratio: [1, 1], phase: 0 })).toBeLessThan(0.05);
    expect(openness(LOGO)).toBeGreaterThan(0.3);
  });

  it('rests every word on an open figure, never a flat retrace', () => {
    for (const { text, curve } of HERO_WORDS) {
      expect(openness(curve), text).toBeGreaterThan(0.3);
    }
  });

  it('moves about half a turn per word, and a full turn home to the logo', () => {
    HERO_WORDS.forEach(({ text, curve }, i) => {
      const next = HERO_WORDS[(i + 1) % HERO_WORDS.length];
      const turn = turnBetween(curve.phase, next.curve.phase) / Math.PI;
      if (next.curve === LOGO) {
        expect(turn, `${text} → ${next.text}`).toBeGreaterThan(1.5);
      } else {
        expect(turn, `${text} → ${next.text}`).toBeGreaterThan(0.5);
        expect(turn, `${text} → ${next.text}`).toBeLessThanOrEqual(1.5 + 1e-9);
      }
    });
  });
});
