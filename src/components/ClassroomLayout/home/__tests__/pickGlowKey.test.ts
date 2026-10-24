import { describe, expect, it } from 'vitest';
import { pickGlowKey } from '../HomeGlow';

const apart = (a: number, b: number) => {
  const d = Math.abs(a - b) % 12;
  return Math.min(d, 12 - d);
};

describe('pickGlowKey', () => {
  it('never keeps its color and never lands within a key of the other side', () => {
    for (let current = 0; current < 12; current++) {
      for (let other = 0; other < 12; other++) {
        for (const r of [0, 0.25, 0.5, 0.75, 0.999]) {
          const next = pickGlowKey(current, other, () => r);
          expect(next).not.toBe(current);
          expect(apart(next, other)).toBeGreaterThanOrEqual(2);
        }
      }
    }
  });

  it('reaches every allowed key, not just the tritone', () => {
    const seen = new Set<number>();
    for (let i = 0; i < 100; i++) seen.add(pickGlowKey(3, 0, () => i / 100));
    // Not 3 (current), not 11, 0 or 1 (within a key of 0).
    expect([...seen].sort((a, b) => a - b)).toEqual([2, 4, 5, 6, 7, 8, 9, 10]);
  });
});
