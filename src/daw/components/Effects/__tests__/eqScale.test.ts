/**
 * The EQ as its box shrinks: the nodes scale down with the height, and below
 * a height the numbers go (the dock's EQ card, 2026-10-22).
 */
import { describe, expect, it } from 'vitest';
import {
  EQ_NODE_SCALE_MAX,
  EQ_NODE_SCALE_MIN,
  EQ_NUMBERS_MIN_H,
  eqNodeScale,
  eqShowsNumbers,
} from '../eqScale';

describe('the EQ as its box shrinks', () => {
  it('shows its numbers in a tall box and drops them in a short one', () => {
    expect(eqShowsNumbers(220)).toBe(true);
    expect(eqShowsNumbers(EQ_NUMBERS_MIN_H)).toBe(true);
    expect(eqShowsNumbers(EQ_NUMBERS_MIN_H - 1)).toBe(false);
    expect(eqShowsNumbers(135)).toBe(false);
  });

  it('scales its nodes down with the height, between two limits', () => {
    expect(eqNodeScale(400)).toBe(EQ_NODE_SCALE_MAX);
    expect(eqNodeScale(40)).toBe(EQ_NODE_SCALE_MIN);
    const mid = eqNodeScale(150);
    expect(mid).toBeLessThan(EQ_NODE_SCALE_MAX);
    expect(mid).toBeGreaterThan(EQ_NODE_SCALE_MIN);
    expect(eqNodeScale(160)).toBeGreaterThan(eqNodeScale(140));
  });
});
