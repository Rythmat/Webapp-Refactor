import { afterEach, describe, expect, it, vi } from 'vitest';
import { easeInOut, easeOut, tween } from './motion';

afterEach(() => vi.unstubAllGlobals());

describe('tween', () => {
  it('runs eased frames for its length, ending on exactly 1', () => {
    const frames: ((now: number) => void)[] = [];
    vi.stubGlobal('requestAnimationFrame', (fn: (now: number) => void) => {
      frames.push(fn);
      return frames.length;
    });
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    const seen: number[] = [];
    const done = vi.fn();
    tween(100, easeOut, (p) => seen.push(p), done);
    for (const now of [0, 50, 100]) frames.shift()!(now);
    expect(seen[0]).toBe(0);
    expect(seen[1]).toBeCloseTo(easeOut(0.5));
    expect(seen.at(-1)).toBe(1);
    expect(done).toHaveBeenCalledOnce();
  });

  it('jumps to the end at once for no time', () => {
    const seen: number[] = [];
    tween(0, easeInOut, (p) => seen.push(p));
    expect(seen).toEqual([1]);
  });
});
