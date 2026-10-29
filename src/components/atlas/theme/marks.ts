import { KEY_RAINBOW_COLORS } from '@/features/landing/rainbow';

/**
 * The map's marks as values that everything drawing or explaining them
 * shares: the map, the ring, the cards and the legend. No maplibre import,
 * so it can sit in any chunk.
 *
 * Colour: the app's key rainbow (KEY_RAINBOW_COLORS, in fifths: C G D A E B
 * F♯ D♭ A♭ E♭ B♭ F) for links, the era colours for halos (ERA_HEX). Key A's
 * yellow is the brand's and no mark takes it.
 */

/** The key rainbow by note, in KEY_RAINBOW_COLORS's order. */
const KEY_INDEX = {
  C: 0,
  G: 1,
  D: 2,
  A: 3,
  E: 4,
  B: 5,
  'F#': 6,
  Db: 7,
  Ab: 8,
  Eb: 9,
  Bb: 10,
  F: 11,
} as const;

/** Key A's yellow: the brand's, never a mark's. */
export const BRAND_YELLOW_INDEX = KEY_INDEX.A;

const key = (note: keyof typeof KEY_INDEX) =>
  KEY_RAINBOW_COLORS[KEY_INDEX[note]];

/** The selected place's light: the "sun" every link of it grows from. */
export const SUN_WHITE = 'rgb(255, 255, 255)';

/**
 * Where a place's music came from: links arrive in cool keys, from the far
 * place's end to white at the selected place (line-progress 0 → 1).
 */
export const ROOTS_RAMP: readonly string[] = [
  key('F#'),
  key('Db'),
  key('Ab'),
  key('Eb'),
  SUN_WHITE,
];

/**
 * Where it went: links leave white from the selected place and warm up to
 * the far place's end (line-progress 0 → 1).
 */
export const ROUTES_RAMP: readonly string[] = [
  SUN_WHITE,
  key('Bb'),
  key('F'),
  key('C'),
  key('G'),
];

/** A colour (`rgb(r, g, b)` or `#rrggbb`) at an alpha, as `rgba(…)`. */
export function withAlpha(color: string, alpha: number): string {
  const a = Math.round(Math.min(1, Math.max(0, alpha)) * 1000) / 1000;
  const hex = /^#([0-9a-f]{6})$/i.exec(color);
  if (hex) {
    const n = parseInt(hex[1], 16);
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
  }
  const rgb = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i.exec(color);
  if (rgb) return `rgba(${rgb[1]}, ${rgb[2]}, ${rgb[3]}, ${a})`;
  throw new Error(`withAlpha: not an rgb or hex colour: ${color}`);
}

/**
 * A place's halo, in px at the map's middle zooms: from a speck for the
 * quietest to `maxPx` for the busiest, by `level` (√ of its events over the
 * most's, so the area follows the count).
 */
export const HALO = { minPx: 3, maxPx: 22 } as const;

export const haloRadius = (level: number): number =>
  HALO.minPx + (HALO.maxPx - HALO.minPx) * Math.min(1, Math.max(0, level));

/**
 * A link's width in px by how many influences it carries: one is a thread,
 * the busiest no wider than 8.
 */
export const edgeWidth = (count: number): number =>
  Math.min(8, 1.5 + 1.75 * Math.log2(Math.max(0, count) + 1));

/** Links carrying this many influences or fewer are weak ties: dotted. */
export const WEAK_LINK_MAX = 2;
