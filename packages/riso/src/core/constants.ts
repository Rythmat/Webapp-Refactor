/**
 * The print system. Transcribed from upstream `prints/workings/index.html`.
 *
 * `prints/workings` is the canonical variant because it is K-parametric: raising OUT scales the
 * screen pitch and the starvation flecks with it, so a bigger bake is the same picture larger
 * rather than a differently-screened one. See PARITY.md.
 */

export const CSS = 720; // styled size
export const W = 1080; // drawing space; every scene draws in 1080 units

/* Bake size. The screen pitch is defined in device pixels, so a bigger print
   has to scale the pitch with it or the dots get finer instead of the picture
   getting larger. Both move together here: OUT = 2160 is the same picture at
   2x, print-ready at about 7 inches, not a differently-screened one. */
export const OUT = 1080;
export const K = OUT / W;
export const PITCH = 4.6 * K; // device px between dot centres

export const CX = W / 2;
export const CY = W / 2;

export const PAPER = '#F2EDE3';

/**
 * Canonical ink order. `as const` gives both the `Ink` union and a stable iteration order, which
 * lets plate loops read `for (const ink of INK_NAMES)` instead of casting `Object.keys(INK)`.
 *
 * That substitution is only safe while this order equals the object literal order below — in
 * `bakeScene`'s ink loop, order IS the picture, because each plate multiplies onto the last.
 * Asserted in __tests__/constants.test.ts.
 */
export const INK_NAMES = [
  'blue',
  'pink',
  'yellow',
  'green',
  'orange',
  'violet',
  'indigo',
] as const;

export type Ink = (typeof INK_NAMES)[number];

export const INK: Readonly<Record<Ink, string>> = {
  blue: '#0078BF',
  pink: '#FF48B0',
  yellow: '#FFE800',
  green: '#00A95C',
  orange: '#FF6C2F',
  violet: '#765BA7',
  indigo: '#2E3192',
};

export interface ScreenAngle {
  a: number;
  b: number;
}

/* Screen angles as rational tangents (b/a). A rotated dot grid only repeats
   seamlessly on a rational tangent, so these are the real angles rather than
   the nominal 15/45/75 — any other value leaves a visible seam where the
   pattern tile wraps. */
export const SCREEN: Readonly<Record<Ink, ScreenAngle>> = {
  blue: { a: 4, b: 1 }, // 14.0°
  pink: { a: 1, b: 4 }, // 76.0°
  yellow: { a: 1, b: 0 }, //  0.0°
  green: { a: 1, b: 1 }, // 45.0°
  orange: { a: 2, b: 1 }, // 26.6°
  violet: { a: 1, b: 2 }, // 63.4°
  indigo: { a: 1, b: 1 }, // 45.0°
};

/* Registration: each plate misses by a fixed amount, in device px. */
export const REG: Readonly<Record<Ink, readonly [number, number]>> = {
  blue: [1.5, -1.0],
  pink: [-2.5, 2.0],
  yellow: [2.0, 1.5],
  green: [-1.5, -1.5],
  orange: [1.0, 2.0],
  violet: [-2.0, -1.0],
  indigo: [0.0, 0.0],
};
