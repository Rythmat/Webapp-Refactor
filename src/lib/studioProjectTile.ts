/**
 * Deterministic honeycomb tile art for the interactive hex tiles (Arcade game
 * cards, the Arcade hero, Studio project thumbnails). Each tile gets a curated,
 * "coolors-trending"-style colour palette picked deterministically from its seed,
 * painted onto the shared honeycomb engine (`generateAvatarPolygons`) and
 * serialised to an inline SVG string that `HexWaveBackground` renders.
 *
 * Palettes are hand-curated (not algorithmically generated): a fixed set of ~28
 * five-colour palettes spanning trending aesthetics — warm-earthy, sunset,
 * bold-vibrant, saturated-pastel, jewel, retro/vaporwave, cottagecore — every one
 * vetted to pop on the dark #101012 tile base. This replaces the earlier OKLCH
 * golden-angle generator, whose even lightness/chroma read muddy.
 */

import { defaultAvatarConfig, generateAvatarPolygons } from './avatarHexGrid';

/**
 * Curated 5-colour palettes in the coolors-trending style, chosen to read well on
 * the dark (#101012) tile base. Tweak freely — this is the single source of tile
 * colour. Keep entries reasonably light/saturated so they don't vanish into the base.
 */
export const TRENDING_PALETTES: string[][] = [
  ['#f94144', '#f3722c', '#f8961e', '#f9c74f', '#90be6d'], // warm rainbow
  ['#ff68a8', '#64cff7', '#f7e752', '#ca7cd8', '#3968cb'], // 90s pop
  ['#674ab3', '#a348a6', '#9f63c4', '#9075d8', '#cea2d7'], // lofi
  ['#596854', '#7f803e', '#cc9a52', '#ad794b', '#fce4b4'], // cottagecore
  ['#00b4d8', '#48cae4', '#90e0ef', '#0096c7', '#0077b6'], // ocean blue
  ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#ff6bed'], // tropical
  ['#ffadad', '#ffd6a5', '#fdffb6', '#caffbf', '#9bf6ff'], // candy pastel
  ['#ff5d8f', '#ff97b7', '#ffacc5', '#c04cfd', '#7b2cbf'], // berry
  ['#40916c', '#52b788', '#74c69d', '#95d5b2', '#b7e4c7'], // forest
  ['#ffbe0b', '#fb5607', '#ff006e', '#8338ec', '#3a86ff'], // vivid classic
  ['#ff9a8b', '#ff6a88', '#ff99ac', '#fcb69f', '#ffdde1'], // peach coral
  ['#f72585', '#b5179e', '#7209b7', '#4361ee', '#4cc9f0'], // neon gradient
  ['#e07a5f', '#f2cc8f', '#81b29a', '#f4a261', '#e76f51'], // warm earthy
  ['#52ffb8', '#00f5d4', '#00bbf9', '#9b5de5', '#f15bb5'], // mint → pink
  ['#e63946', '#a8dadc', '#457b9d', '#f4a261', '#f1faee'], // retro red/blue
  ['#ff9ff3', '#feca57', '#ff6b6b', '#48dbfb', '#1dd1a1'], // bubblegum
  ['#a06cd5', '#b298dc', '#c19ee0', '#845ec2', '#d65db1'], // grape
  ['#ff9e00', '#ff8500', '#ff6d00', '#ff5400', '#ff0054'], // sunrise
  ['#ccd5ae', '#e9edc9', '#faedcd', '#d4a373', '#e0c097'], // pistachio cream
  ['#06ffa5', '#00e5ff', '#7b61ff', '#ff61a6', '#ffd166'], // electric
  ['#d4a5a5', '#e8b4b8', '#eecbd0', '#c98da3', '#a76d8f'], // dusty rose
  ['#2de2e6', '#ff3864', '#f6019d', '#a663cc', '#6a4c93'], // cyber
  ['#ffd166', '#06d6a0', '#118ab2', '#ef476f', '#f78c6b'], // meadow
  ['#f6bd60', '#f7ede2', '#f5cac3', '#84a59d', '#f28482'], // golden hour
  ['#fe5d9f', '#ff8fab', '#ffb3c6', '#ffc2d1', '#8bd3dd'], // popsicle
  ['#ffca3a', '#ff595e', '#8ac926', '#1982c4', '#6a4c93'], // jelly bold
  ['#80ffdb', '#72efdd', '#64dfdf', '#56cfe1', '#48bfe3'], // aurora teal
  ['#ffb7c3', '#ff8fab', '#fb6f92', '#ffc2d1', '#f9dcc4'], // cherry blossom
];

/** FNV-1a hash → a stable non-negative int for deterministic per-seed picks. */
function hashString(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** Deterministically pick one curated palette for a seed. */
export function pickTrendingPalette(seed: string): string[] {
  return TRENDING_PALETTES[hashString(seed) % TRENDING_PALETTES.length];
}

/** HSL saturation (0–1) of an `#rrggbb` colour — for choosing the accent. */
function hexSaturation(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max === min) return 0;
  const l = (max + min) / 2;
  return (max - min) / (1 - Math.abs(2 * l - 1));
}

/** The curated palette for a tile seed (used as the hex-fill palette). */
export function generateAestheticPalette(seed: string): string[] {
  return pickTrendingPalette(seed);
}

/**
 * A single vivid colour from the tile's own palette — the most-saturated entry —
 * used for the Studio activity card's left accent stripe so stripe and tile match.
 */
export function studioTileAccent(seed: string): string {
  const palette = pickTrendingPalette(seed);
  return palette.reduce((best, c) =>
    hexSaturation(c) > hexSaturation(best) ? c : best,
  );
}

/**
 * Build an inline `<svg>` honeycomb tile for a seed. Reuses the avatar hex engine
 * with the curated palette injected; per-hex hue is kept true (no hue shift) so the
 * palette renders faithfully, with only small saturation/lightness variety for depth.
 * Returned as a raw string — `HexWaveBackground` parses inline SVG directly.
 */
export function generateStudioTileSvg(
  seed: string,
  width = 400,
  height = 400,
): string {
  const config = {
    ...defaultAvatarConfig(seed),
    paletteOverride: generateAestheticPalette(seed),
    hueShift: 0,
    saturationShift: 5,
    lightnessShift: 8,
  };

  const { polygons } = generateAvatarPolygons(config, width, height);
  const body = polygons
    .map(
      (p) =>
        `<polygon points="${p.points}" fill="${p.fill}" stroke-width="1" stroke="${p.fill}"/>`,
    )
    .join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${body}</svg>`;
}
