import { describe, expect, it } from 'vitest';
import { intervalsToString } from './insightConstants';

describe('intervalsToString', () => {
  it('names extensions past the octave, including 13ths', () => {
    // dominant13: R 3 5 b7 9 13
    expect(intervalsToString([0, 4, 7, 10, 14, 21])).toBe('R 3 5 b7 9 13');
    expect(intervalsToString([0, 4, 10, 13, 20])).toBe('R 3 b7 b9 b13');
  });
});
