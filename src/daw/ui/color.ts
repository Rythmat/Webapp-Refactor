import { INK } from './tokens';

/**
 * Text on a colour. Key colours, track colours and chips filled with either
 * need ink that stays readable whatever the hue, so the choice is computed
 * (WCAG 2 contrast) rather than hand-picked per colour.
 */

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

const HEX = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const RGB_FN = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i;

/**
 * A colour's red, green and blue (0–255), from #rgb, #rgba, #rrggbb,
 * #rrggbbaa, rgb() or rgba(). Alpha is ignored: the colour is taken as
 * painted opaque. Anything else (a var(), a name) is null.
 */
export function parseColor(input: string): Rgb | null {
  const color = input.trim();
  const hex = HEX.exec(color);
  if (hex) {
    const digits = hex[1];
    const full =
      digits.length <= 4
        ? Array.from(digits.slice(0, 3), (d) => d + d).join('')
        : digits.slice(0, 6);
    return {
      r: parseInt(full.slice(0, 2), 16),
      g: parseInt(full.slice(2, 4), 16),
      b: parseInt(full.slice(4, 6), 16),
    };
  }
  const fn = RGB_FN.exec(color);
  if (fn) return { r: +fn[1], g: +fn[2], b: +fn[3] };
  return null;
}

const channel = (value: number) => {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

/** WCAG 2 relative luminance, 0 (black) to 1 (white). */
export function relativeLuminance({ r, g, b }: Rgb): number {
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/**
 * The WCAG 2 contrast ratio of two colours, 1 to 21. Unreadable input
 * counts as 1 (no contrast), so a check against it fails rather than passes.
 */
export function contrastRatio(a: string, b: string): number {
  const ca = parseColor(a);
  const cb = parseColor(b);
  if (!ca || !cb) return 1;
  const [hi, lo] = [relativeLuminance(ca), relativeLuminance(cb)].sort(
    (x, y) => y - x,
  );
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * The ink for text on `background`: near-black or white, whichever contrasts
 * more. For a colour this cannot read (a var(), say) it assumes the dark
 * chrome and answers white.
 */
export function onColor(background: string): string {
  if (!parseColor(background)) return INK.light;
  return contrastRatio(INK.dark, background) >=
    contrastRatio(INK.light, background)
    ? INK.dark
    : INK.light;
}
