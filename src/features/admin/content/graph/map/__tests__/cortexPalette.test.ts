import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { KEY_COLORS } from '@/daw/prism-engine/data/keyColors';
import { PRESET_GROUPS } from '../model/colorGroups';
import {
  CORTEX_COLORS,
  type CortexColorName,
  cortexColorIndex,
} from '../model/cortexPalette';
import { hslTripletToHex } from '../render/graphTheme';

/*
 * The guard on Cortex's palette (the owner's Coolors colours): every colour
 * must read on the app's background, none may pass for white (the graph's
 * highlight), and none may be one of Prism's key colours, so a dot is never
 * mistaken for a key.
 *
 * Contrast is WCAG 2's ratio, 3:1 being the bar for graphics. "Near white"
 * is OKLCH lightness above 0.9.
 *
 * Four of the owner's colours missed the bar when the guard was written
 * (1 October 2026): Curriculum, Year and Instruments read under 3:1 on the
 * background, and the reserved Openings peach is lighter than 0.9. They
 * were reported to the owner and kept as chosen, so they are listed here
 * with their measured values. Any other colour that misses, or a change to
 * one of these four, fails the guard, and a fix takes its name off the list.
 */

/** The app's background, as `src/styles/appTheme.css` sets it. */
const BACKGROUND = '#101012';

/** Below this, a dot does not read on the background (WCAG 2, graphics). */
const MIN_CONTRAST = 3;

/** Above this OKLCH lightness, a colour reads as white, the highlight. */
const MAX_LIGHTNESS = 0.9;

/** Reported and kept: each colour under 3:1, with its measured ratio. */
const KNOWN_LOW_CONTRAST: Partial<Record<CortexColorName, number>> = {
  Curriculum: 2.61,
  Year: 2.4,
  Instruments: 2.73,
};

/** Reported and kept: each colour above L 0.9, with its lightness. */
const KNOWN_TOO_LIGHT: Partial<Record<CortexColorName, number>> = {
  Openings: 0.909,
};

const channels = (hex: string): [number, number, number] => {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!m) throw new Error(`not #rrggbb: ${hex}`);
  return [
    parseInt(m[1], 16) / 255,
    parseInt(m[2], 16) / 255,
    parseInt(m[3], 16) / 255,
  ];
};

/** An sRGB channel without its gamma. */
const linear = (c: number) =>
  c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;

/** WCAG 2 relative luminance. */
const luminance = (hex: string) => {
  const [r, g, b] = channels(hex).map(linear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

/** WCAG 2 contrast ratio between two colours, 1 to 21. */
const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

/** OKLCH (OKLab) lightness, 0 to 1. */
const oklchLightness = (hex: string) => {
  const [r, g, b] = channels(hex).map(linear);
  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;
  return (
    0.2104542553 * Math.cbrt(l) +
    0.793617785 * Math.cbrt(m) -
    0.0040720468 * Math.cbrt(s)
  );
};

const rgbHex = (rgb: readonly number[]) =>
  `#${rgb
    .slice(0, 3)
    .map((v) => v.toString(16).padStart(2, '0'))
    .join('')}`;

/** Every colour the guard covers: the palette, and the presets' colours. */
const GUARDED = [
  ...CORTEX_COLORS.map((c) => ({ name: c.name as string, hex: c.hex })),
  ...PRESET_GROUPS.map((g) => ({ name: g.name ?? g.query, hex: g.color })),
];

describe("Cortex's palette guard", () => {
  it('measures against the background the app really paints', () => {
    const css = readFileSync(
      resolve(__dirname, '../../../../../../styles/appTheme.css'),
      'utf8',
    );
    const token = /--ui-background:\s*([^;]+);/.exec(css)?.[1];
    expect(token && hslTripletToHex(token)).toBe(BACKGROUND);
  });

  it('gives every preset group a palette colour', () => {
    for (const group of PRESET_GROUPS) {
      expect(cortexColorIndex(group.color)).toBeGreaterThanOrEqual(0);
    }
  });

  it('reads at 3:1 or better on the background, but for the four reported', () => {
    const low = Object.fromEntries(
      CORTEX_COLORS.filter(
        (c) => contrast(c.hex, BACKGROUND) < MIN_CONTRAST,
      ).map((c) => [c.name, +contrast(c.hex, BACKGROUND).toFixed(2)]),
    );
    expect(low).toEqual(KNOWN_LOW_CONTRAST);
    // Every preset meets the bar or is one of the reported colours.
    for (const group of PRESET_GROUPS) {
      const name = CORTEX_COLORS[cortexColorIndex(group.color)].name;
      if (name in KNOWN_LOW_CONTRAST) continue;
      expect(contrast(group.color, BACKGROUND)).toBeGreaterThanOrEqual(
        MIN_CONTRAST,
      );
    }
  });

  it('has no white or near white (OKLCH L at most 0.9), but for the one reported', () => {
    const light = Object.fromEntries(
      CORTEX_COLORS.filter((c) => oklchLightness(c.hex) > MAX_LIGHTNESS).map(
        (c) => [c.name, +oklchLightness(c.hex).toFixed(3)],
      ),
    );
    expect(light).toEqual(KNOWN_TOO_LIGHT);
    // The twelve presets themselves are all under the line.
    for (const { color } of PRESET_GROUPS) {
      expect(oklchLightness(color)).toBeLessThanOrEqual(MAX_LIGHTNESS);
    }
    // White itself, for the record, is far over it.
    expect(oklchLightness('#ffffff')).toBeGreaterThan(MAX_LIGHTNESS);
  });

  it("uses none of Prism's key colours", () => {
    const keys = new Set(Object.values(KEY_COLORS).map(rgbHex));
    // White (Prism's "other"), the twelve keys and the four scale colours.
    expect(keys.size).toBe(17);
    for (const { name, hex } of GUARDED) {
      expect(keys.has(hex), `${name} ${hex} is a Prism key colour`).toBe(false);
    }
  });
});
