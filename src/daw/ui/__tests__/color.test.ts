import { describe, expect, it } from 'vitest';
import { KEY_OF_COLORS } from '@/constants/theme';
import { TRACK_PALETTES } from '@/daw/constants/trackColors';
import {
  contrastRatio,
  onColor,
  parseColor,
  relativeLuminance,
} from '../color';
import { COLOR, INK } from '../tokens';

// ── onColor: readable ink on any colour ─────────────────────────────────────
// Chips filled with a key or track colour, and the key swatches, pick their
// text by WCAG 2 contrast instead of by hand.

describe('parseColor', () => {
  it('reads hex in every length and rgb()/rgba()', () => {
    expect(parseColor('#abc')).toEqual({ r: 170, g: 187, b: 204 });
    expect(parseColor('#abcf')).toEqual({ r: 170, g: 187, b: 204 });
    expect(parseColor('#0b3954')).toEqual({ r: 11, g: 57, b: 84 });
    expect(parseColor('#0B395480')).toEqual({ r: 11, g: 57, b: 84 });
    expect(parseColor('rgb(1, 2, 3)')).toEqual({ r: 1, g: 2, b: 3 });
    expect(parseColor('rgba(255 128 0 / 0.5)')).toEqual({
      r: 255,
      g: 128,
      b: 0,
    });
  });

  it('turns down what it cannot read', () => {
    expect(parseColor('var(--daw-text)')).toBeNull();
    expect(parseColor('teal')).toBeNull();
    expect(parseColor('#12')).toBeNull();
  });
});

describe('contrastRatio', () => {
  it('matches WCAG 2 at the extremes', () => {
    expect(relativeLuminance({ r: 0, g: 0, b: 0 })).toBe(0);
    expect(relativeLuminance({ r: 255, g: 255, b: 255 })).toBe(1);
    expect(contrastRatio('#ffffff', '#000000')).toBeCloseTo(21);
    expect(contrastRatio('#777777', '#777777')).toBe(1);
  });

  it('is the same either way round', () => {
    expect(contrastRatio('#101012', '#e8e8f0')).toBeCloseTo(
      contrastRatio('#e8e8f0', '#101012'),
    );
  });

  it('counts unreadable input as no contrast', () => {
    expect(contrastRatio('var(--x)', '#ffffff')).toBe(1);
  });
});

describe('onColor', () => {
  it('puts near-black ink on A (yellow) and white on deep navy', () => {
    expect(onColor('#FFCB30')).toBe(INK.dark);
    expect(onColor('#FFCB30')).toBe('#101012');
    expect(onColor('#0b3954')).toBe(INK.light);
    expect(onColor('#0b3954')).toBe('#ffffff');
  });

  it('picks the ink with more contrast, on every key and track colour', () => {
    for (const color of [...Object.values(KEY_OF_COLORS), ...TRACK_PALETTES]) {
      const ink = onColor(color);
      const other = ink === INK.dark ? INK.light : INK.dark;
      expect(contrastRatio(ink, color), color).toBeGreaterThanOrEqual(
        contrastRatio(other, color),
      );
    }
  });

  it('reads at AA (4.5:1) on all twelve key colours', () => {
    for (const [key, color] of Object.entries(KEY_OF_COLORS)) {
      expect(contrastRatio(onColor(color), color), key).toBeGreaterThanOrEqual(
        4.5,
      );
    }
  });

  it('never drops under 4.3:1 on a track colour (the worst a mid-tone allows)', () => {
    // With #101012 and white as the inks, a colour whose contrast with both
    // is equal sits at about 4.35:1, so no ink choice can do better there.
    for (const color of TRACK_PALETTES) {
      expect(contrastRatio(onColor(color), color), color).toBeGreaterThan(4.3);
    }
  });

  it('assumes the dark chrome when the colour cannot be read', () => {
    expect(onColor('var(--daw-text)')).toBe(INK.light);
  });
});

describe('the token palette passes its contrast promises', () => {
  const value = (name: keyof typeof COLOR) => COLOR[name].value;

  it('keeps the dimmest text at AA on every surface', () => {
    for (const surface of ['bg', 'surface-1', 'popover'] as const) {
      expect(
        contrastRatio(value('text-3'), value(surface)),
        surface,
      ).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('keeps text on its fills at AA: the white pill, danger, red text', () => {
    expect(
      contrastRatio(value('on-primary'), value('primary')),
    ).toBeGreaterThanOrEqual(4.5);
    expect(
      contrastRatio(value('on-danger'), value('danger')),
    ).toBeGreaterThanOrEqual(4.5);
    expect(
      contrastRatio(value('danger-text'), value('popover')),
    ).toBeGreaterThanOrEqual(4.5);
  });

  it('shows the focus ring at 3:1 or more on the chrome', () => {
    expect(contrastRatio(value('focus'), value('bg'))).toBeGreaterThanOrEqual(
      3,
    );
  });
});
