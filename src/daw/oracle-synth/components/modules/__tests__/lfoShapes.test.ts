/**
 * The dock's LFO shape and rate pickers (lfoShapes.ts): a shape at a rate
 * fills every bar and quarter, and reads back; a drawn LFO reads as none.
 *
 * Run: npx vitest run src/daw/oracle-synth/components/modules/__tests__/lfoShapes.test.ts
 */
import { describe, expect, it } from 'vitest';
import {
  detectLfoShape,
  LFO_RATES,
  LFO_SHAPES,
  lfoPattern,
} from '../lfoShapes';

describe('lfoPattern', () => {
  it('repeats the shape at the rate in all four bars', () => {
    const p = lfoPattern('triangle', '1/4');
    expect(p.bars).toHaveLength(4);
    // A triangle four times a bar: four peaks at 1.
    expect(p.bars[0].filter((n) => n.value === 1)).toHaveLength(4);
    expect(p.rateDivs.flat().every((r) => r === '1/4')).toBe(true);
  });
});

describe('detectLfoShape', () => {
  it('reads back every shape at every rate', () => {
    for (const { value: shape } of LFO_SHAPES) {
      for (const { value: rate } of LFO_RATES) {
        expect(detectLfoShape(lfoPattern(shape, rate))).toEqual({
          shape,
          rate,
        });
      }
    }
  });

  it('calls a drawn LFO none of them', () => {
    const p = lfoPattern('sine', '1/2');
    p.bars[2] = [
      { time: 0, value: 0.2 },
      { time: 1, value: 0.9 },
    ];
    expect(detectLfoShape(p)).toBeNull();
  });
});
