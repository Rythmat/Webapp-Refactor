// ── A hex artwork's colours (owner, 2026-10-26) ──────────────────────────
// Learn's tiles take their accent from their hex art: the art's fills, most
// used first, and from them the one that reads on a dark card.

/** The SVG's fill colours, most used first, as lowercase #rrggbb. */
export function hexArtPalette(svg: string): string[] {
  const counts = new Map<string, number>();
  for (const [, hex] of svg.matchAll(/fill="(#[0-9a-fA-F]{6})"/g)) {
    const key = hex.toLowerCase();
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([hex]) => hex);
}

/** Hue (degrees), saturation and lightness (0..1) of a #rrggbb colour. */
export function hsl(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (!d) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1));
  const h =
    max === r
      ? ((g - b) / d) % 6
      : max === g
        ? (b - r) / d + 2
        : (r - g) / d + 4;
  return [(h * 60 + 360) % 360, s, l];
}

/**
 * The art's accent: its most used colour that reads on a dark card, vivid
 * and neither too dark nor washed out (Electronic's violet, not its navy
 * ground). Failing that, its most used colour with any colour in it; null
 * for art of greys.
 */
export function artAccent(palette: readonly string[]): string | null {
  const strong = palette.find((hex) => {
    const [, s, l] = hsl(hex);
    return s >= 0.45 && l >= 0.38 && l <= 0.82;
  });
  if (strong) return strong;
  return (
    palette.find((hex) => {
      const [, s, l] = hsl(hex);
      return s >= 0.25 && l >= 0.15 && l <= 0.9;
    }) ?? null
  );
}
