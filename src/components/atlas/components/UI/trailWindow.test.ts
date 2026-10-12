import { describe, expect, it } from 'vitest';
import { trailWindow } from './AtlasToolbar';

describe('trailWindow', () => {
  it('draws a short trail whole', () => {
    expect(trailWindow(5, 4, 16)).toEqual({ start: 0, end: 5 });
    expect(trailWindow(16, 0, 16)).toEqual({ start: 0, end: 16 });
  });

  it('draws the latest steps of a long trail', () => {
    expect(trailWindow(80, 79, 16)).toEqual({ start: 64, end: 80 });
    expect(trailWindow(80, 70, 16)).toEqual({ start: 64, end: 80 });
  });

  it('follows the cursor back, with one step before it in view', () => {
    expect(trailWindow(80, 64, 16)).toEqual({ start: 63, end: 79 });
    expect(trailWindow(80, 10, 16)).toEqual({ start: 9, end: 25 });
    expect(trailWindow(80, 0, 16)).toEqual({ start: 0, end: 16 });
  });
});
