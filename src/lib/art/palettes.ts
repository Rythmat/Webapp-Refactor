// ── Art palettes ───────────────────────────────────────────────────────────
// The gradients the generative covers are stroked with (owner, 2026-10-28:
// the "full gradient" look of tubik's Muzaic — multi-hue light inside the
// line art, on the near-black canvas). Art only: notes, keys and chords keep
// their musical colours (modeColorShift / KEY_OF_COLORS).
//
// The default is the spectrum: the 12 key-center colours round the circle
// of fifths, the app's one decorative rainbow (the landing's horizon, the
// prompt bar's write-in and comet), used as light the way Googlebook uses
// its rainbow on black (owner, 2026-10-28). It is a circle, so it repeats
// without a seam: F's pink runs back into C's red. The other palettes are
// seldom-used alternates; every stop of theirs reads on #101012 (3:1 or
// better) and none is yellow (the retired brand colour).

import { KEY_RAINBOW_COLORS } from '@/features/landing/rainbow';

export const ART_PALETTE_NAMES = [
  'spectrum',
  'white',
  'aurora',
  'lagoon',
  'nebula',
  'ember',
  'tide',
  'glacier',
  'bloom',
  'infra',
] as const;

export type ArtPaletteName = (typeof ART_PALETTE_NAMES)[number];

const rgbToHex = (rgb: string): string => {
  const [r, g, b] = (rgb.match(/\d+/g) ?? []).map(Number);
  return `#${[r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('')}`.toUpperCase();
};

/** The 12 key colours, C G D … F, as hex. */
export const SPECTRUM: readonly string[] = KEY_RAINBOW_COLORS.map(rgbToHex);

/** The default palette: the art is drawn in it unless an item names another. */
export const DEFAULT_ART_PALETTE = 'spectrum' as const;

/** Each palette's stops, first to last along its gradient. */
export const ART_PALETTES: Readonly<Record<ArtPaletteName, readonly string[]>> =
  {
    spectrum: SPECTRUM,
    // White line, as Learn's sigils draw (owner, 2026-10-28: the Arcade's
    // waves in white): bright white to the cards' ink white and back.
    white: ['#FFFFFF', '#E8E8F0', '#C9C9D6'],
    // The signature look: Muzaic's player strands.
    aurora: ['#3B6BFF', '#7B5CFF', '#C04DF5', '#FF5FA8'],
    // Its helix: teal into lime.
    lagoon: ['#19C3C9', '#3FE0A0', '#B6F25C'],
    nebula: ['#6A5CFF', '#B84DFF', '#FF4FD1'],
    // Warm without yellow: orange → pink → violet (the mood blobs).
    ember: ['#FF8A3D', '#FF4F7B', '#C04DF5'],
    tide: ['#2F7BFF', '#27C6F0', '#7AF0CF'],
    glacier: ['#8FD3FF', '#7C9BFF', '#C3B1FF'],
    bloom: ['#FF8FC2', '#E58CFF', '#9FA8FF'],
    infra: ['#FF3D6E', '#C23DFF', '#4D6BFF'],
  };

export const isArtPaletteName = (name: string): name is ArtPaletteName =>
  (ART_PALETTE_NAMES as readonly string[]).includes(name);

const toRgb = (hex: string): [number, number, number] => {
  const n = parseInt(hex.slice(1, 7), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

const toHex = ([r, g, b]: readonly number[]): string =>
  `#${[r, g, b]
    .map((c) =>
      Math.round(Math.min(255, Math.max(0, c)))
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`.toUpperCase();

/** The colour at `t` (0 → first stop, 1 → last) along a palette. */
export function paletteAt(name: ArtPaletteName, t: number): string {
  const stops = ART_PALETTES[name];
  const at = Math.min(1, Math.max(0, t)) * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(at));
  const f = at - i;
  const a = toRgb(stops[i]);
  const b = toRgb(stops[i + 1]);
  return toHex(a.map((c, k) => c + (b[k] - c) * f));
}

/**
 * `n` colours spread evenly along a palette, its first and last stops
 * included: four of them colour a guitar diagram's fingers 1–4.
 */
export function samplePalette(name: ArtPaletteName, n: number): string[] {
  if (n <= 1) return [paletteAt(name, 0.5)];
  return Array.from({ length: n }, (_, i) => paletteAt(name, i / (n - 1)));
}

/**
 * A palette's stops as one seamless lap, first stop at both ends: the
 * spectrum closes its circle (F back to C), the others run there and back.
 * A gradient of these that repeats every frame has no seam.
 */
export function cyclicStops(name: ArtPaletteName): string[] {
  const stops = ART_PALETTES[name];
  return name === 'spectrum'
    ? [...stops, stops[0]]
    : [...stops, ...stops.slice(0, -1).reverse()];
}

/** One colour that stands for the palette (its middle): a tile's accent. */
export const paletteAccent = (name: ArtPaletteName): string =>
  paletteAt(name, 0.5);
