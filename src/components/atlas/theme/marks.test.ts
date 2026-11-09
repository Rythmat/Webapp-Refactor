import { describe, expect, it } from 'vitest';
import { KEY_RAINBOW_COLORS } from '@/features/landing/rainbow';
import {
  BRAND_YELLOW_INDEX,
  ROOTS_RAMP,
  ROUTES_RAMP,
  SUN_WHITE,
  edgeWidth,
  haloRadius,
  HALO,
  withAlpha,
} from './marks';

describe('the map’s marks', () => {
  it('runs links through the key rainbow into and out of the white sun', () => {
    expect(ROOTS_RAMP.at(-1)).toBe(SUN_WHITE);
    expect(ROUTES_RAMP[0]).toBe(SUN_WHITE);
    for (const color of [...ROOTS_RAMP, ...ROUTES_RAMP]) {
      if (color === SUN_WHITE) continue;
      expect(KEY_RAINBOW_COLORS).toContain(color);
    }
  });

  it('never takes the brand’s yellow', () => {
    const yellow = KEY_RAINBOW_COLORS[BRAND_YELLOW_INDEX];
    expect(ROOTS_RAMP).not.toContain(yellow);
    expect(ROUTES_RAMP).not.toContain(yellow);
  });

  it('writes a colour at an alpha', () => {
    expect(withAlpha('rgb(255, 115, 72)', 0.5)).toBe('rgba(255, 115, 72, 0.5)');
    expect(withAlpha('#8b5cf6', 0.2)).toBe('rgba(139, 92, 246, 0.2)');
    expect(withAlpha('#ffffff', 2)).toBe('rgba(255, 255, 255, 1)');
    expect(() => withAlpha('teal', 1)).toThrow();
  });

  it('widens a link with what it carries, to 8 px at most', () => {
    expect(edgeWidth(1)).toBeCloseTo(3.25);
    expect(edgeWidth(3)).toBeGreaterThan(edgeWidth(2));
    expect(edgeWidth(1000)).toBe(8);
    expect(edgeWidth(0)).toBe(1.5);
  });

  it('sizes a halo between a speck and the busiest place’s', () => {
    expect(haloRadius(0)).toBe(HALO.minPx);
    expect(haloRadius(1)).toBe(HALO.maxPx);
    expect(haloRadius(4)).toBe(HALO.maxPx);
  });
});
