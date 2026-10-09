import {
  MODE_DISPLAY,
  MODE_GROUPS,
  MODES,
} from '@/daw/prism-engine/data/modes';
import type { ModeName } from '@/daw/prism-engine/types';

/**
 * The Modal Sphere's data and geometry (`3d-orb.tsx` draws it). Pure: no
 * React, no DOM.
 *
 * The sphere is drawn flat, as seen from above its north pole:
 *
 * - 7 rings are the diatonic modes, brightest outside: Lydian (outer ring)
 *   to Locrian (inner ring).
 * - 12 wedges are the key signatures round the circle of fifths, each in its
 *   key's colour. A wedge holds the 7 modes of one key signature: the red
 *   wedge (no sharps or flats) holds F Lydian, C Ionian, G Mixolydian …
 *   B Locrian.
 * - A cell is one mode on one root.
 *
 * A spiral joins one root's 7 modes. Each mode a step darker has one flat
 * more, so it sits one wedge further round. Aligning a spiral turns every
 * ring so that root's 7 cells line up in Ionian's wedge: the parallel modes
 * of that root, stacked bright to dark.
 *
 * `LONGITUDES` is the source of truth for the note spellings: they are
 * enharmonically exact (E♯ Locrian in six sharps, G♭ Lydian in five flats).
 */

/** The diatonic modes, Lydian (the outer ring) to Locrian (the inner ring). */
export const DIATONIC_MODES: readonly string[] = MODE_GROUPS[0].modes;

export interface Longitude {
  /** The key signature as drawn: "♮", "##", "♭♭♭". */
  label: string;
  /** The key signature as read aloud: "no sharps or flats", "2 sharps". */
  spoken: string;
  /** The key's colour (Prism's key colours). */
  hex: string;
  /** The root of each mode in this key signature, Lydian to Locrian. */
  notes: readonly string[];
}

const F = '♭';

/** The 12 key signatures round the circle of fifths, each with its 7 mode roots. */
export const LONGITUDES: readonly Longitude[] = [
  {
    label: '♮',
    spoken: 'no sharps or flats',
    hex: '#d2404a',
    notes: ['F', 'C', 'G', 'D', 'A', 'E', 'B'],
  },
  {
    label: '#',
    spoken: '1 sharp',
    hex: '#ff7348',
    notes: ['C', 'G', 'D', 'A', 'E', 'B', 'F#'],
  },
  {
    label: '##',
    spoken: '2 sharps',
    hex: '#fea92a',
    notes: ['G', 'D', 'A', 'E', 'B', 'F#', 'C#'],
  },
  {
    label: '###',
    spoken: '3 sharps',
    hex: '#ffcb30',
    notes: ['D', 'A', 'E', 'B', 'F#', 'C#', 'G#'],
  },
  {
    label: '####',
    spoken: '4 sharps',
    hex: '#aed580',
    notes: ['A', 'E', 'B', 'F#', 'C#', 'G#', 'D#'],
  },
  {
    label: '#####',
    spoken: '5 sharps',
    hex: '#7fc783',
    notes: ['E', 'B', 'F#', 'C#', 'G#', 'D#', 'A#'],
  },
  {
    label: '######',
    spoken: '6 sharps',
    hex: '#28a69a',
    notes: ['B', 'F#', 'C#', 'G#', 'D#', 'A#', 'E#'],
  },
  {
    label: `${F}${F}${F}${F}${F}`,
    spoken: '5 flats',
    hex: '#62b4f7',
    notes: [`G${F}`, `D${F}`, `A${F}`, `E${F}`, `B${F}`, 'F', 'C'],
  },
  {
    label: `${F}${F}${F}${F}`,
    spoken: '4 flats',
    hex: '#7885cb',
    notes: [`D${F}`, `A${F}`, `E${F}`, `B${F}`, 'F', 'C', 'G'],
  },
  {
    label: `${F}${F}${F}`,
    spoken: '3 flats',
    hex: '#9d7fce',
    notes: [`A${F}`, `E${F}`, `B${F}`, 'F', 'C', 'G', 'D'],
  },
  {
    label: `${F}${F}`,
    spoken: '2 flats',
    hex: '#c785d3',
    notes: [`E${F}`, `B${F}`, 'F', 'C', 'G', 'D', 'A'],
  },
  {
    label: F,
    spoken: '1 flat',
    hex: '#f8a8c5',
    notes: [`B${F}`, 'F', 'C', 'G', 'D', 'A', 'E'],
  },
];

/** A spelled note's pitch class (C = 0). */
export const NOTE_TO_PC: Readonly<Record<string, number>> = {
  C: 0,
  'C#': 1,
  [`D${F}`]: 1,
  D: 2,
  'D#': 3,
  [`E${F}`]: 3,
  E: 4,
  'E#': 5,
  F: 5,
  'F#': 6,
  [`G${F}`]: 6,
  G: 7,
  'G#': 8,
  [`A${F}`]: 8,
  A: 9,
  'A#': 10,
  [`B${F}`]: 10,
  B: 11,
};

/** A spiral's name in the centre: one spelling per pitch class. */
export const PC_NAMES: readonly string[] = [
  'C',
  'C♯',
  'D',
  'E♭',
  'E',
  'F',
  'F♯',
  'G',
  'A♭',
  'A',
  'B♭',
  'B',
];

/** Each diatonic mode's intervals, Lydian to Locrian. */
export const MODE_INTERVALS: readonly string[] = [
  '1, 2, 3, ♯4, 5, 6, 7',
  '1, 2, 3, 4, 5, 6, 7',
  '1, 2, 3, 4, 5, 6, ♭7',
  '1, 2, ♭3, 4, 5, 6, ♭7',
  '1, 2, ♭3, 4, 5, ♭6, ♭7',
  '1, ♭2, ♭3, 4, 5, ♭6, ♭7',
  '1, ♭2, ♭3, 4, ♭5, ♭6, ♭7',
];

/** A note as the sphere writes it: real sharp signs ("F♯"); flats already are. */
export const noteLabel = (note: string): string => note.replace(/#/g, '♯');

/** A mode's display name: "Ionian". */
export const modeName = (m: number): string =>
  MODE_DISPLAY[DIATONIC_MODES[m]] ?? DIATONIC_MODES[m];

/** The root note of mode `m` in key signature `w`. */
export const rootOf = (w: number, m: number): string => LONGITUDES[w].notes[m];

/* ── Geometry (SVG units) ─────────────────────────────────────────────── */

export const SIZE = 700;
export const CENTER = SIZE / 2;
export const OUTER_RADIUS = SIZE * 0.42;
export const INNER_RADIUS = SIZE * 0.12;
/** Where the key-signature labels sit, outside the outer ring. */
export const RIM_RADIUS = OUTER_RADIUS + 26;
export const RING_COUNT = DIATONIC_MODES.length;
export const WEDGE_COUNT = LONGITUDES.length;
export const WEDGE_ANGLE = (Math.PI * 2) / WEDGE_COUNT;
export const WEDGE_DEG = 360 / WEDGE_COUNT;

/** A ring's outer and inner radius. */
export function ringRadii(m: number): { r1: number; r2: number } {
  const step = (OUTER_RADIUS - INNER_RADIUS) / RING_COUNT;
  return { r1: OUTER_RADIUS - step * m, r2: OUTER_RADIUS - step * (m + 1) };
}

/** A cell's SVG path, unturned (a ring's turn is the group's transform). */
export function cellPath(m: number, w: number): string {
  const { r1, r2 } = ringRadii(m);
  const a1 = w * WEDGE_ANGLE - Math.PI / 2;
  const a2 = a1 + WEDGE_ANGLE;
  const p = (r: number, a: number) =>
    `${CENTER + r * Math.cos(a)} ${CENTER + r * Math.sin(a)}`;
  return [
    `M ${p(r1, a1)}`,
    `A ${r1} ${r1} 0 0 1 ${p(r1, a2)}`,
    `L ${p(r2, a2)}`,
    `A ${r2} ${r2} 0 0 0 ${p(r2, a1)}`,
    'Z',
  ].join(' ');
}

/** A cell's centre, turned by `turnDeg`. */
export function cellCenterPos(
  m: number,
  w: number,
  turnDeg = 0,
): { x: number; y: number } {
  const { r1, r2 } = ringRadii(m);
  const r = (r1 + r2) / 2;
  const a =
    w * WEDGE_ANGLE - Math.PI / 2 + WEDGE_ANGLE / 2 + (turnDeg * Math.PI) / 180;
  return { x: CENTER + r * Math.cos(a), y: CENTER + r * Math.sin(a) };
}

/** Where wedge `w`'s key-signature label sits on the rim. */
export function rimPos(w: number): { x: number; y: number } {
  const a = w * WEDGE_ANGLE - Math.PI / 2 + WEDGE_ANGLE / 2;
  return {
    x: CENTER + RIM_RADIUS * Math.cos(a),
    y: CENTER + RIM_RADIUS * Math.sin(a),
  };
}

/* ── Spirals ──────────────────────────────────────────────────────────── */

export interface Spiral {
  pc: number;
  /** The wedge holding this root in each ring, Lydian to Locrian. */
  wedges: number[];
}

/** One spiral per pitch class: where its 7 modes sit. */
export function buildSpirals(): Spiral[] {
  return Array.from({ length: 12 }, (_, pc) => ({
    pc,
    wedges: DIATONIC_MODES.map((_, m) =>
      LONGITUDES.findIndex((lon) => NOTE_TO_PC[lon.notes[m]] === pc),
    ),
  }));
}

export const SPIRALS: readonly Spiral[] = buildSpirals();

/** A spiral's SVG path through its cells' centres, with each ring turned. */
export function spiralPath(
  spiral: Spiral,
  turnsDeg: readonly number[],
): string {
  const points = spiral.wedges.map((w, m) =>
    cellCenterPos(m, w, turnsDeg[m] ?? 0),
  );
  return points.length < 2
    ? ''
    : 'M ' + points.map((p) => `${p.x} ${p.y}`).join(' L ');
}

/**
 * How far to turn each ring, in degrees, so a spiral's 7 cells line up in
 * its Ionian cell's wedge. Each ring takes the short way round: no ring turns
 * more than half a turn.
 */
export function alignDegrees(spiral: Spiral): number[] {
  const target = spiral.wedges[1]; // Ionian (ring 1) stays put
  return spiral.wedges.map((w) => {
    let steps = (((target - w) % WEDGE_COUNT) + WEDGE_COUNT) % WEDGE_COUNT;
    if (steps > WEDGE_COUNT / 2) steps -= WEDGE_COUNT;
    return steps * WEDGE_DEG;
  });
}

/* ── Scales ───────────────────────────────────────────────────────────── */

const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const LETTER_PC = [0, 2, 4, 5, 7, 9, 11];
const ACCIDENTAL: Record<number, string> = {
  [-2]: '\u{1D12B}',
  [-1]: '♭',
  0: '',
  1: '♯',
  2: '\u{1D12A}',
};

/**
 * The 7 notes of mode `m` on its root in key signature `w`, spelled one
 * letter each from the root (so E♯ Locrian reads E♯ F♯ G♯ A♯ B C♯ D♯).
 */
export function scaleOf(w: number, m: number): string[] {
  const root = rootOf(w, m);
  const rootPc = NOTE_TO_PC[root];
  const letter = LETTERS.indexOf(root[0]);
  const intervals = MODES[DIATONIC_MODES[m] as ModeName];
  return intervals.map((interval, i) => {
    const l = (letter + i) % 7;
    let diff = (rootPc + interval - LETTER_PC[l]) % 12;
    if (diff > 6) diff -= 12;
    if (diff < -6) diff += 12;
    return LETTERS[l] + (ACCIDENTAL[diff] ?? '?');
  });
}

/* ── Keyboard ─────────────────────────────────────────────────────────── */

export interface Cell {
  w: number;
  m: number;
}

/**
 * The cell an arrow key moves to: ← and → go round a ring (→ clockwise,
 * toward the sharps), ↑ and ↓ go between rings (↑ outward, toward Lydian).
 * Other keys return null.
 */
export function moveCell(cell: Cell, key: string): Cell | null {
  switch (key) {
    case 'ArrowRight':
      return { w: (cell.w + 1) % WEDGE_COUNT, m: cell.m };
    case 'ArrowLeft':
      return { w: (cell.w + WEDGE_COUNT - 1) % WEDGE_COUNT, m: cell.m };
    case 'ArrowUp':
      return { w: cell.w, m: Math.max(0, cell.m - 1) };
    case 'ArrowDown':
      return { w: cell.w, m: Math.min(RING_COUNT - 1, cell.m + 1) };
    default:
      return null;
  }
}

/** A cell as read aloud: "C Ionian, key signature no sharps or flats". */
export const cellLabel = ({ w, m }: Cell): string =>
  `${noteLabel(rootOf(w, m))} ${modeName(m)}, key signature ${LONGITUDES[w].spoken}`;

/** Clamped smootherstep: still at both ends (the logo's easing). */
export const smootherstep = (x: number): number =>
  x <= 0 ? 0 : x >= 1 ? 1 : Math.min(1, x * x * x * (x * (6 * x - 15) + 10));
