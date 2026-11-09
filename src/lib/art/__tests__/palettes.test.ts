import { describe, expect, it } from 'vitest';
import { contrastRatio } from '@/daw/ui/color';
import { KEY_RAINBOW_COLORS } from '@/features/landing/rainbow';
import {
  ALTERNATE_PALETTES,
  ART_PALETTE_NAMES,
  ART_PALETTES,
  cyclicStops,
  paletteAt,
  paletteFor,
  samplePalette,
  SPECTRUM,
} from '../index';

/** A colour's hue in degrees (0 red, 60 yellow, 120 green …). */
function hueOf(hex: string): number {
  const n = parseInt(hex.slice(1, 7), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(
    (c) => c / 255,
  );
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  if (d === 0) return 0;
  const h =
    max === r
      ? ((g - b) / d) % 6
      : max === g
        ? (b - r) / d + 2
        : (r - g) / d + 4;
  return (h * 60 + 360) % 360;
}

describe('the art palettes', () => {
  it('read on the canvas: every stop 3:1 or better on #101012', () => {
    for (const name of ART_PALETTE_NAMES) {
      for (const stop of ART_PALETTES[name]) {
        expect(
          contrastRatio(stop, '#101012'),
          `${name} ${stop}`,
        ).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it('make the spectrum the 12 key colours round the circle of fifths', () => {
    expect(SPECTRUM).toHaveLength(12);
    expect(SPECTRUM).toEqual(
      KEY_RAINBOW_COLORS.map((rgb) => {
        const [r, g, b] = rgb.match(/\d+/g)!.map(Number);
        return `#${[r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('')}`.toUpperCase();
      }),
    );
    expect(ART_PALETTES.spectrum).toBe(SPECTRUM);
  });

  it('close every lap where it began, so a repeating gradient has no seam', () => {
    for (const name of ART_PALETTE_NAMES) {
      const lap = cyclicStops(name);
      expect(lap[0]).toBe(lap[lap.length - 1]);
    }
  });

  it('keep the alternates off yellow (the retired brand colour)', () => {
    // The spectrum is the landing's approved key rainbow; the alternates
    // must not bring a yellow of their own.
    for (const name of ALTERNATE_PALETTES) {
      // Every stop and the colours between them.
      for (let t = 0; t <= 1; t += 0.05) {
        const hue = hueOf(paletteAt(name, t));
        expect(hue < 40 || hue > 65, `${name} at ${t}: ${hue}`).toBe(true);
      }
    }
  });

  it('samples from first stop to last', () => {
    const aurora = ART_PALETTES.aurora;
    const four = samplePalette('aurora', 4);
    expect(four).toHaveLength(4);
    expect(four[0]).toBe(aurora[0]);
    expect(four[3]).toBe(aurora[aurora.length - 1]);
  });

  it('lets seeds reach every alternate, never the default', () => {
    const seen = new Set(
      Array.from({ length: 400 }, (_, i) => paletteFor(`seed-${i}`)),
    );
    expect(seen.size).toBe(ALTERNATE_PALETTES.length);
    expect(seen.has('spectrum')).toBe(false);
  });
});
