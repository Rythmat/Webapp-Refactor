import { SPECTRUM } from '@/lib/art/palettes';

// ── A cover's colours ──────────────────────────────────────────────────────
// Every cover is coloured by its course's key (colour means the key, as
// everywhere in the app), paired with its neighbour round the circle of
// fifths for the second tone: the analogous two-tone gradients of Suno's
// collection tiles. Mixed in OKLab so gradients never go muddy. Never a fill
// in the brand-yellow band (40–65°): A's amber is skipped.

const FIFTHS: Readonly<Record<string, number>> = {
  C: 0,
  G: 1,
  D: 2,
  A: 3,
  E: 4,
  B: 5,
  'F#': 6,
  Gb: 6,
  'C#': 7,
  Db: 7,
  'G#': 8,
  Ab: 8,
  'D#': 9,
  Eb: 9,
  'A#': 10,
  Bb: 10,
  F: 11,
};

/** A key's place round the circle of fifths (C 0, G 1 … F 11), or 0. */
export function fifthsIndex(key: string): number {
  const name = key.trim().replace('♯', '#').replace('♭', 'b');
  return FIFTHS[name] ?? 0;
}

/** A's amber sits in the brand-yellow band: never a fill. */
const YELLOW = 3;

/** A key's colour. */
export const keyColor = (key: string): string => {
  const at = fifthsIndex(key);
  return SPECTRUM[at === YELLOW ? 2 : at];
};

/**
 * A key's colour and its neighbour's round the fifths: the one above (or,
 * with `down`, below), the other way where that would be A's amber.
 */
export function keyPair(key: string, down = false): [string, string] {
  const at = fifthsIndex(key);
  const a = at === YELLOW ? 2 : at;
  const near = (a + (down ? 11 : 1)) % 12;
  const b = near === YELLOW ? (a + (down ? 1 : 11)) % 12 : near;
  return [SPECTRUM[a], SPECTRUM[b === YELLOW ? 4 : b]];
}

/**
 * A Truchet cover's two colours (owner, 2026-11-05: every Truchet pattern a
 * clear two-colour gradient, as Best of Reggae's): the key's and the one
 * three fifths on, a quarter of the way round the spectrum. C, G and D step
 * the other way, so the gradient never passes A's amber.
 */
export function truchetPair(key: string): [string, string] {
  return pairAt(fifthsIndex(key));
}

/** The Truchet pair for a place round the fifths (C 0 … F 11). */
function pairAt(at: number): [string, string] {
  const a = at === YELLOW ? 2 : at;
  return [SPECTRUM[a], SPECTRUM[partnerOf(a)]];
}

const partnerOf = (a: number) => (a <= YELLOW ? (a + 9) % 12 : (a + 3) % 12);

/**
 * A colour that isn't one of the spectrum's (a mode's own, from
 * colorForKeyMode) with the Truchet partner of the spectrum colour nearest
 * it, so it keeps its hue and still pairs as the covers do. A colour in the
 * brand-yellow band gives way to that nearest colour.
 */
export function pairNear(hex: string): [string, string] {
  const hue = hueOf(hex);
  let best = 0;
  let gap = Infinity;
  SPECTRUM.forEach((c, i) => {
    if (i === YELLOW) return;
    const d = Math.abs(((hueOf(c) - hue + 540) % 360) - 180);
    if (d < gap) {
      gap = d;
      best = i;
    }
  });
  const own = hue >= 40 && hue <= 65 ? SPECTRUM[best] : hex;
  return [own, SPECTRUM[partnerOf(best)]];
}

// ── OKLab ──────────────────────────────────────────────────────────────────

type Lab = [number, number, number];

const toLinear = (c: number) =>
  c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
const toGamma = (c: number) =>
  c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex([r, g, b]: readonly number[]): string {
  return `#${[r, g, b]
    .map((c) =>
      Math.round(Math.min(255, Math.max(0, c)))
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`;
}

function toLab(hex: string): Lab {
  const [r, g, b] = hexToRgb(hex).map((c) => toLinear(c / 255));
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

function fromLab([L, A, B]: Lab): string {
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
  return rgbToHex(
    [
      4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
      -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
      -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
    ].map((c) => toGamma(Math.min(1, Math.max(0, c))) * 255),
  );
}

/** Between two colours, `t` of the way, in OKLab. */
export function mix(a: string, b: string, t: number): string {
  const x = toLab(a);
  const y = toLab(b);
  return fromLab([
    x[0] + (y[0] - x[0]) * t,
    x[1] + (y[1] - x[1]) * t,
    x[2] + (y[2] - x[2]) * t,
  ]);
}

/** Lighter (amount > 0) or darker, in OKLab lightness; hue kept. */
export function shade(hex: string, amount: number): string {
  const [L, A, B] = toLab(hex);
  const k = amount < 0 ? 1 + amount * 0.6 : 1;
  return fromLab([Math.min(1, Math.max(0, L + amount)), A * k, B * k]);
}

/** A colour's HSL hue in degrees (for the yellow guard). */
export function hueOf(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((c) => c / 255);
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

/** The covers' paper: the app's canvas, a touch lifted. */
export const PAPER = '#141418';
