// ── The harmonic-proportion guitar ─────────────────────────────────────────
// An instrument drawn from its own string. With the scale length L as the
// unit (25 inches here), the string's divisions are circles: partial n is n
// circles of diameter L/n stacked from the nut to the bridge, each one
// touching the next exactly at a node. They are laid over a solid-body
// double-cutaway guitar (SG style) drawn to the same scale, its headstock
// inside the L/2 circle above the nut. After the idea of designing an
// instrument from the harmonic proportions of its string.
//
// Coordinates are in L: x across (0 = the string), y down from the nut
// (0) to the bridge (1). Pure numbers; HarmonistView draws them.

import { HARMONIC_NECK_FRETS, positionOfFret } from '@/lib/guitar/harmonics';

export const SCALE_INCHES = 25;

export interface Circle {
  cx: number;
  cy: number;
  r: number;
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

/** Partial n's circles: diameter 1/n, the k-th spanning [k/n, (k+1)/n]. */
export function partialCircles(n: number): Circle[] {
  return Array.from({ length: n }, (_, k) => ({
    cx: 0,
    cy: (k + 0.5) / n,
    r: 1 / (2 * n),
  }));
}

export interface TangentPoint {
  /** At k/n of the string. */
  k: number;
  y: number;
  /** In lowest terms: partial n rings here (else it is a lower partial's node). */
  rings: boolean;
}

/** Where partial n's circles touch: every k/n between nut and bridge. */
export function tangentPoints(n: number): TangentPoint[] {
  return Array.from({ length: n - 1 }, (_, i) => {
    const k = i + 1;
    return { k, y: k / n, rings: gcd(k, n) === 1 };
  });
}

// ── The instrument ─────────────────────────────────────────────────────────

/** The fundamental: diameter L, nut to bridge. */
export const FUNDAMENTAL: Circle = { cx: 0, cy: 0.5, r: 0.5 };

/** The headstock's circle, diameter L/2 above the nut. */
export const HEAD: Circle = { cx: 0, cy: -0.25, r: 0.25 };

// ── The body: a solid-body double cutaway (SG style) ───────────────────────
// Two horns either side of a neck that joins near the 22nd fret, each a hook
// curling in toward it over a round cutaway; a waist at the bridge pickup;
// a long, round lower bout with the knobs. Drawn front on, bass side on the
// left (x < 0). Proportions measured from the owner's reference (2026-10-27,
// scaled so its nut-to-bridge is L): our own curves through its landmarks.

/** A point in L, and a cubic segment (two controls, then its end). */
type Pt = readonly [number, number];
type Cubic = readonly [Pt, Pt, Pt];

const BODY_START: Pt = [-0.039, 0.737];

/** The body's outline, clockwise from the bass side of the neck joint. */
export const BODY_OUTLINE: readonly Cubic[] = [
  // Bass cutaway: round, back up to the horn's hook…
  [
    [-0.063, 0.741],
    [-0.101, 0.746],
    [-0.114, 0.713],
  ],
  [
    [-0.123, 0.687],
    [-0.129, 0.657],
    [-0.116, 0.642],
  ],
  // …over the horn and down its outer edge to the upper body.
  [
    [-0.147, 0.645],
    [-0.194, 0.687],
    [-0.205, 0.746],
  ],
  // In to the waist, at the bridge pickup.
  [
    [-0.215, 0.802],
    [-0.2, 0.877],
    [-0.175, 0.933],
  ],
  // Out to the lower bout, widest below the bridge.
  [
    [-0.151, 0.989],
    [-0.241, 1.045],
    [-0.244, 1.129],
  ],
  // The bottom.
  [
    [-0.248, 1.231],
    [-0.129, 1.297],
    [0, 1.304],
  ],
  [
    [0.129, 1.297],
    [0.252, 1.231],
    [0.248, 1.129],
  ],
  [
    [0.244, 1.045],
    [0.155, 0.989],
    [0.177, 0.933],
  ],
  [
    [0.2, 0.877],
    [0.218, 0.806],
    [0.209, 0.746],
  ],
  // The treble horn, up to its hook…
  [
    [0.198, 0.687],
    [0.151, 0.645],
    [0.118, 0.642],
  ],
  // …and down round the treble cutaway to the neck.
  [
    [0.131, 0.657],
    [0.125, 0.687],
    [0.116, 0.713],
  ],
  [
    [0.103, 0.746],
    [0.065, 0.741],
    [0.039, 0.737],
  ],
];

/**
 * The pickguard: tucked under the pickups and the neck, its top a swoop up
 * into the treble horn, its side inset from the body's edge (in at the
 * waist), its foot rounded beside the bridge and back to the bridge
 * pickup.
 */
const GUARD_START: Pt = [0.037, 0.748];
const GUARD_OUTLINE: readonly Cubic[] = [
  [
    [0.059, 0.762],
    [0.096, 0.771],
    [0.121, 0.765],
  ],
  [
    [0.143, 0.757],
    [0.154, 0.725],
    [0.159, 0.701],
  ],
  [
    [0.161, 0.69],
    [0.164, 0.683],
    [0.169, 0.683],
  ],
  [
    [0.183, 0.687],
    [0.189, 0.729],
    [0.19, 0.767],
  ],
  [
    [0.192, 0.818],
    [0.183, 0.865],
    [0.171, 0.893],
  ],
  [
    [0.161, 0.916],
    [0.157, 0.944],
    [0.16, 0.977],
  ],
  [
    [0.161, 1],
    [0.171, 1.019],
    [0.168, 1.028],
  ],
  [
    [0.157, 1.035],
    [0.129, 1.033],
    [0.105, 1.019],
  ],
  [
    [0.082, 1.005],
    [0.063, 0.986],
    [0.052, 0.974],
  ],
  [
    [0.045, 0.97],
    [0.039, 0.967],
    [0.037, 0.963],
  ],
];

function outlinePath(start: Pt, outline: readonly Cubic[], unit: number) {
  const p = ([x, y]: Pt) => `${x * unit} ${y * unit}`;
  return [
    `M ${p(start)}`,
    ...outline.map(([a, b, c]) => `C ${p(a)}, ${p(b)}, ${p(c)}`),
    'Z',
  ].join(' ');
}

/** The body's outline as an SVG path, at `unit` drawing units an L. */
export function bodyPath(unit: number): string {
  return outlinePath(BODY_START, BODY_OUTLINE, unit);
}

/** The pickguard as an SVG path. */
export function pickguardPath(unit: number): string {
  return outlinePath(GUARD_START, GUARD_OUTLINE, unit);
}

/** A rectangle in L: centre, half width, half height. */
export interface Part {
  cx: number;
  cy: number;
  hw: number;
  hh: number;
}

/** The two humbuckers: at the end of the fretboard, and by the bridge. */
export const PICKUPS: readonly Part[] = [
  { cx: 0, cy: 0.8, hw: 0.054, hh: 0.03 },
  { cx: 0, cy: 0.944, hw: 0.054, hh: 0.03 },
];

/** The bridge (at the scale length) and the stopbar tailpiece: two bars. */
export const BRIDGE: Part = { cx: 0, cy: 1, hw: 0.068, hh: 0.01 };
export const TAILPIECE: Part = { cx: 0, cy: 1.056, hw: 0.068, hh: 0.01 };

/** Two volume and two tone knobs, a diamond on the treble lower bout. */
export const KNOBS: readonly Circle[] = [
  { cx: 0.125, cy: 1.101, r: 0.02 },
  { cx: 0.187, cy: 1.127, r: 0.02 },
  { cx: 0.067, cy: 1.162, r: 0.02 },
  { cx: 0.131, cy: 1.187, r: 0.02 },
];

/** The headstock's flower: one L/16-radius circle and six round it. */
export function headFlower(): Circle[] {
  const centre = { cx: 0, cy: -0.21 };
  const r = 1 / 16;
  return [
    { ...centre, r },
    ...Array.from({ length: 6 }, (_, i) => {
      const a = (Math.PI / 3) * i + Math.PI / 6;
      return {
        cx: centre.cx + r * Math.cos(a),
        cy: centre.cy + r * Math.sin(a),
        r,
      };
    }),
  ];
}

/** The neck's half-width at the nut and at the 24th fret, in L. */
export const NECK_HALF = { nut: 0.034, end: 0.046 } as const;

/** Where the neck ends: the 24th fret. */
export const NECK_END = positionOfFret(HARMONIC_NECK_FRETS);

/** Fret distances from the nut, in inches at a 25" scale (fret 12 = 12.500"). */
export function fretTableInches(scale = SCALE_INCHES): number[] {
  return Array.from(
    { length: HARMONIC_NECK_FRETS },
    (_, i) => positionOfFret(i + 1) * scale,
  );
}

/** "12.5"" for a diameter of L/n. */
export function diameterLabel(n: number, scale = SCALE_INCHES): string {
  const inches = scale / n;
  return `${Number.isInteger(inches) ? inches : Number(inches.toFixed(3))}"`;
}
