import { describe, expect, it } from 'vitest';
import { dragLoopRange, hitTestLoop, rulerPressTarget } from './rulerLoop';

const BEAT = 480;
const loop = { start: 1920, end: 3840 }; // bar 2 → bar 3

describe('hitTestLoop', () => {
  it('finds the edges, then the body, then empty ruler', () => {
    expect(hitTestLoop(100, 100, 300)).toBe('loop-start');
    expect(hitTestLoop(104, 100, 300)).toBe('loop-start');
    expect(hitTestLoop(297, 100, 300)).toBe('loop-end');
    expect(hitTestLoop(200, 100, 300)).toBe('loop-body');
    expect(hitTestLoop(50, 100, 300)).toBe('empty');
    expect(hitTestLoop(400, 100, 300)).toBe('empty');
  });

  it('gives a narrow loop to the nearer edge', () => {
    expect(hitTestLoop(101, 100, 108)).toBe('loop-start');
    expect(hitTestLoop(107, 100, 108)).toBe('loop-end');
  });

  it('treats an empty range as no loop', () => {
    expect(hitTestLoop(100, 100, 100)).toBe('empty');
  });
});

describe('rulerPressTarget', () => {
  const STRIP = 14;
  const PLAYHEAD_X = 500;

  it('hit-tests the loop in the top strip', () => {
    expect(rulerPressTarget(200, 5, 100, 300, STRIP, PLAYHEAD_X)).toBe(
      'loop-body',
    );
    expect(rulerPressTarget(100, 5, 100, 300, STRIP, PLAYHEAD_X)).toBe(
      'loop-start',
    );
  });

  it('ignores the loop in the bar-number lane, so clicks there seek', () => {
    expect(rulerPressTarget(200, 25, 100, 300, STRIP, PLAYHEAD_X)).toBe(
      'empty',
    );
    expect(rulerPressTarget(100, 25, 100, 300, STRIP, PLAYHEAD_X)).toBe(
      'empty',
    );
  });

  it('grabs the playhead handle near the playhead in the number lane', () => {
    expect(rulerPressTarget(503, 25, 100, 300, STRIP, PLAYHEAD_X)).toBe(
      'playhead',
    );
    expect(rulerPressTarget(520, 25, 100, 300, STRIP, PLAYHEAD_X)).toBe(
      'empty',
    );
    // …even over the loop's range, but never from the loop strip.
    expect(rulerPressTarget(200, 25, 100, 300, STRIP, 200)).toBe('playhead');
    expect(rulerPressTarget(200, 5, 100, 300, STRIP, 200)).toBe('loop-body');
  });
});

describe('dragLoopRange', () => {
  it('draws a new loop between the snapped press and drag points, either way', () => {
    expect(dragLoopRange('empty', loop, 500, 2000, BEAT)).toEqual({
      start: 480,
      end: 1920,
    });
    expect(dragLoopRange('empty', loop, 2000, 500, BEAT)).toEqual({
      start: 480,
      end: 1920,
    });
  });

  it('keeps a new loop at least one grid step long', () => {
    expect(dragLoopRange('empty', loop, 960, 1000, BEAT)).toEqual({
      start: 960,
      end: 1440,
    });
  });

  it('moves the loop by whole grid steps without changing its length', () => {
    expect(dragLoopRange('loop-body', loop, 2400, 2400 + 1000, BEAT)).toEqual({
      start: 2880,
      end: 4800,
    });
    expect(dragLoopRange('loop-body', loop, 2400, 0, BEAT)).toEqual({
      start: 0,
      end: 1920,
    });
  });

  it('resizes from either edge without crossing the other', () => {
    expect(dragLoopRange('loop-start', loop, 1920, 1000, BEAT)).toEqual({
      start: 960,
      end: 3840,
    });
    expect(dragLoopRange('loop-start', loop, 1920, 9999, BEAT)).toEqual({
      start: 3360,
      end: 3840,
    });
    expect(dragLoopRange('loop-end', loop, 3840, 5000, BEAT)).toEqual({
      start: 1920,
      end: 4800,
    });
    expect(dragLoopRange('loop-end', loop, 3840, 0, BEAT)).toEqual({
      start: 1920,
      end: 2400,
    });
  });
});
