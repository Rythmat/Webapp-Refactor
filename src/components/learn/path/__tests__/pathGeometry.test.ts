import { describe, expect, it } from 'vitest';
import { discRatio, waveAt, wavePath } from '../pathGeometry';

describe('stops on a sine wave', () => {
  it('swings centre, one way, centre, the other way', () => {
    expect(waveAt(0)).toBeCloseTo(0, 9);
    expect(waveAt(1)).toBeCloseTo(-1, 9);
    expect(waveAt(2)).toBeCloseTo(0, 9);
    expect(waveAt(3)).toBeCloseTo(1, 9);
    expect(waveAt(4)).toBeCloseTo(0, 9);
  });

  it('carries its phase across a level', () => {
    expect(waveAt(5)).toBeCloseTo(waveAt(1), 9);
  });

  it('draws the line through every stop', () => {
    const d = wavePath(0, 3, 2, 7);
    const points = d.split(/[ML]/).filter(Boolean);
    expect(points).toHaveLength(49);
    // Stop 1 is a whole swing to the left, half way down its row.
    expect(points[24].trim()).toBe('0.000 10.500');
    expect(points[0].trim()).toBe('2.000 3.500');
  });

  it('draws nothing to join for one stop', () => {
    expect(wavePath(0, 1, 2, 7).split(/[ML]/).filter(Boolean)).toHaveLength(1);
  });

  it('gives neighbouring discs different figures', () => {
    for (let i = 0; i < 20; i++) {
      expect(discRatio(i).join()).not.toBe(discRatio(i + 1).join());
    }
  });
});
