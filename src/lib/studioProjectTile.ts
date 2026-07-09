/**
 * Deterministic honeycomb tile art for Studio Project cards.
 *
 * Studio projects have no predefined Genre/Theory tile, so we synthesize one per
 * project: an aesthetic colour palette generated from the project id, painted
 * onto the shared honeycomb engine (`generateAvatarPolygons`) and serialised to
 * an inline SVG string that `HexWaveBackground` can render interactively.
 *
 * Palette algorithm: OKLCH + golden-angle (137.5°) hue stepping. OKLCH is
 * perceptually uniform — equal-lightness colours read as equally bright across
 * hues (HSL's core failing) — and the golden angle spreads hues evenly with no
 * clustering. OKLCH→sRGB uses Björn Ottosson's Oklab matrix
 * (https://bottosson.github.io/posts/oklab/); seeding reuses `alea`. No new deps.
 */

import Alea from 'alea';
import { defaultAvatarConfig, generateAvatarPolygons } from './avatarHexGrid';

const GOLDEN_ANGLE = 137.508; // ≈ 360 / φ — maximally-separated hue stepping

const clamp01 = (n: number): number => Math.min(Math.max(n, 0), 1);

/**
 * Convert an OKLCH colour (L 0–1, C ~0–0.4, H degrees) to an `#rrggbb` string.
 * Oklab → linear sRGB via Ottosson's matrix, then gamma-encode + gamut-clamp.
 */
function oklchToHex(l: number, c: number, hDeg: number): string {
  const h = (hDeg * Math.PI) / 180;
  const a = c * Math.cos(h);
  const b = c * Math.sin(h);

  const l_ = l + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = l - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = l - 0.0894841775 * a - 1.291485548 * b;

  const l3 = l_ * l_ * l_;
  const m3 = m_ * m_ * m_;
  const s3 = s_ * s_ * s_;

  const lr = 4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3;
  const lg = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3;
  const lb = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3;

  const encode = (x: number): string => {
    const srgb =
      x <= 0.0031308
        ? 12.92 * x
        : 1.055 * Math.pow(clamp01(x), 1 / 2.4) - 0.055;
    return Math.round(clamp01(srgb) * 255)
      .toString(16)
      .padStart(2, '0');
  };

  return `#${encode(lr)}${encode(lg)}${encode(lb)}`;
}

/**
 * Generate a deterministic, aesthetically-cohesive palette from a seed string.
 * Hues step by the golden angle from a seeded base; lightness ramps gently with
 * a little jitter; chroma alternates for subtle variety.
 */
export function generateAestheticPalette(seed: string, size = 6): string[] {
  const prng = Alea(seed);
  const baseHue = prng() * 360;

  return Array.from({ length: size }, (_, i) => {
    const hue = (baseHue + i * GOLDEN_ANGLE) % 360;
    const lightness = clamp01(0.55 + (i / size) * 0.17 + (prng() - 0.5) * 0.06);
    const chroma = 0.15 + (i % 2) * 0.03; // 0.15 / 0.18
    return oklchToHex(lightness, chroma, hue);
  });
}

/**
 * A single vivid colour from the same seed/hue family as the tile — used for the
 * activity card's left accent stripe so stripe and tile stay in sync.
 */
export function studioTileAccent(seed: string): string {
  const baseHue = Alea(seed)() * 360; // same first draw as the palette's base hue
  return oklchToHex(0.62, 0.19, baseHue);
}

/**
 * Build an inline `<svg>` honeycomb tile for a project seed. Reuses the avatar
 * hex engine with the generated palette injected, keeping per-hex noise variety
 * modest so the palette stays coherent. Returned as a raw string (not a URL) —
 * `HexWaveBackground` parses inline SVG directly.
 */
export function generateStudioTileSvg(
  seed: string,
  width = 400,
  height = 400,
): string {
  const config = {
    ...defaultAvatarConfig(seed),
    paletteOverride: generateAestheticPalette(seed),
    hueShift: 8,
    saturationShift: 6,
    lightnessShift: 10,
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
