// ── The sigils' circle (owner, 2026-10-26) ────────────────────────────────
// Every figure is drawn in a 100-unit box centred on 0, on a circle of
// radius R, position 0 at the top and clockwise, as the Studio's key wheel
// puts C at the top. The twelve notes go round it in one of two orders:
// chromatic (a semitone a step) or fifths (a fifth a step, as the key
// wheel's wedges), which are the same notes reordered: a note's place in
// fifths is its pitch class × 7, mod 12.

export const R = 36;
export const TAU = Math.PI * 2;

/** Position `i` of `n` round the circle (0 at the top, clockwise). */
export const at = (i: number, n: number, r = R): [number, number] => {
  const a = -Math.PI / 2 + (TAU * i) / n;
  return [r * Math.cos(a), r * Math.sin(a)];
};

/** A point at `deg` degrees round the circle (0 at the top, clockwise). */
export const atAngle = (deg: number, r = R): [number, number] =>
  at(deg, 360, r);

/** SVG `points` for positions `idx` of `n`. */
export const points = (idx: readonly number[], n: number) =>
  idx
    .map((i) =>
      at(i, n)
        .map((v) => v.toFixed(2))
        .join(','),
    )
    .join(' ');

/** A pitch class's place round the circle of fifths (C 0, G 1 … F 11). */
export const fifthsIndex = (pc: number) => (((pc * 7) % 12) + 12) % 12;

export type NoteOrder = 'chromatic' | 'fifths';

const mod12 = (n: number) => ((n % 12) + 12) % 12;

/**
 * Where a pitch class sits round the circle, in degrees, in an order. The
 * chromatic order is turned to keep `anchor` where it sits in fifths (the
 * mode page's chosen key stays put; the other notes close round it a
 * semitone a step): with the anchor on C, plain chromatic, C at the top.
 */
export const angleOf = (pc: number, order: NoteOrder, anchor = 0) =>
  (order === 'fifths'
    ? fifthsIndex(pc)
    : mod12(pc - anchor + fifthsIndex(anchor))) * 30;

/** The turn from one angle to another the short way round, in degrees
 *  (−180 … 180). */
export const shortestAngle = (from: number, to: number) =>
  ((((to - from) % 360) + 540) % 360) - 180;
