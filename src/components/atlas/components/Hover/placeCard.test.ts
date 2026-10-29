import { describe, expect, it } from 'vitest';
import { placeCard } from './placeCard';

const CLEAR = { left: 8, top: 8, right: 1000, bottom: 700 };
const CARD = { width: 220, height: 90 };

describe('where the hover card goes', () => {
  it('hangs to the right of its anchor, centred on it', () => {
    expect(placeCard({ x: 300, y: 300 }, CARD, CLEAR)).toEqual({
      left: 314,
      top: 255,
    });
  });

  it('turns to the left before it would run under the Inspector', () => {
    expect(placeCard({ x: 900, y: 300 }, CARD, CLEAR).left).toBe(
      900 - 14 - 220,
    );
  });

  it('stays inside the clear map, top and bottom', () => {
    expect(placeCard({ x: 300, y: 0 }, CARD, CLEAR).top).toBe(8);
    expect(placeCard({ x: 300, y: 700 }, CARD, CLEAR).top).toBe(700 - 90);
  });
});
