import type { PartDef, TermDef } from './anatomyTypes';
import { circle, strip, type V2, type V3 } from './iso';

// ── The neck ───────────────────────────────────────────────────────────────
// The layers every fretted instrument here shares, as they really go together: the shaft with
// the truss rod in it, the fretboard glued over the rod, the marker inlays and
// fret wires in the board, the nut at its head. Frets are to scale.

export const NECK_PART_IDS = [
  'neckShaft',
  'trussRod',
  'fretboard',
  'markers',
  'frets',
  'nut',
] as const;

export interface NeckSpec {
  nutU: number;
  scale: number;
  fretCount: number;
  /** Where the fretboard ends, over the body. */
  boardEndU: number;
  /** Where the shaft ends, under the fretboard or in the body. */
  heelU: number;
  halfNut: number;
  halfEnd: number;
  /** The shaft's underside and top; the board sits on the top. */
  z0: number;
  z1: number;
  /** Where the whole neck goes when the guitar comes apart. */
  explode: V3;
  /** Which frets have a single dot; the 12th's double is separate. */
  markerFrets?: readonly number[];
  doubleTwelfth?: boolean;
  /** Most ukuleles have none. */
  trussRod?: boolean;
  /** A fret wire's width. */
  fretWidth?: number;
}

const BOARD_THICKNESS = 0.2;
const FRET_HEIGHT = 0.05;
const MARKER_FRETS = [3, 5, 7, 9, 15, 17, 19, 21];

export const boardTop = (spec: NeckSpec) => spec.z1 + BOARD_THICKNESS;

/** Distance of a fret from the nut, on a to-scale string. */
export const fretDistance = (fret: number, scale: number) =>
  scale * (1 - 2 ** (-fret / 12));

const plus = (a: V3, u: number, v: number, z: number): V3 => [
  a[0] + u,
  a[1] + v,
  a[2] + z,
];

/** The neck's half width at a point along it. */
const halfAt = (spec: NeckSpec, u: number) =>
  spec.halfNut +
  ((spec.nutU - u) / (spec.nutU - spec.boardEndU)) *
    (spec.halfEnd - spec.halfNut);

const taper = (spec: NeckSpec, fromU: number): V2[] => {
  const end = halfAt(spec, fromU);
  return [
    [fromU, -end],
    [spec.nutU, -spec.halfNut],
    [spec.nutU, spec.halfNut],
    [fromU, end],
  ];
};

export function neckParts(spec: NeckSpec): PartDef[] {
  const { nutU, scale, fretCount, boardEndU, heelU, z0, z1, explode } = spec;
  const top = boardTop(spec);
  const fretU = (fret: number) => nutU - fretDistance(fret, scale);
  const channel = 0.11;

  const frets = Array.from({ length: fretCount }, (_, i) => {
    const u = fretU(i + 1);
    const half = halfAt(spec, u);
    return {
      outer: strip([u, -half], [u, half], spec.fretWidth ?? 0.07),
      z0: top,
      z1: top + FRET_HEIGHT,
      hatch: false,
    };
  });

  const markerAt = (fret: number, v: number) => ({
    outer: circle((fretU(fret) + fretU(fret - 1)) / 2, v, 0.13, 14),
    z0: top,
    z1: top + 0.012,
    hatch: false,
  });
  const markers = [
    ...(spec.markerFrets ?? MARKER_FRETS)
      .filter((fret) => fret <= fretCount)
      .map((fret) => markerAt(fret, 0)),
    ...(spec.doubleTwelfth === false
      ? []
      : [markerAt(12, -0.42), markerAt(12, 0.42)]),
  ];

  // Each gap between two frets, outlined just inside them.
  const fretSpaces = Array.from({ length: fretCount }, (_, i): V3[] => {
    const near = i === 0 ? nutU - 0.1 : fretU(i) - 0.06;
    const far = fretU(i + 1) + 0.06;
    const nearHalf = halfAt(spec, near) - 0.04;
    const farHalf = halfAt(spec, far) - 0.04;
    return [
      [near, -nearHalf, top],
      [near, nearHalf, top],
      [far, farHalf, top],
      [far, -farHalf, top],
      [near, -nearHalf, top],
    ];
  });

  const hasRod = spec.trussRod !== false;
  const all: PartDef[] = [
    {
      id: 'neckShaft',
      solids: [{ outer: taper(spec, heelU), z0, z1 }],
      marks: !hasRod
        ? []
        : [
            [
              [boardEndU + 0.3, -channel, z1],
              [nutU - 0.15, -channel, z1],
            ],
            [
              [boardEndU + 0.3, channel, z1],
              [nutU - 0.15, channel, z1],
            ],
          ],
      explode,
    },
    {
      id: 'trussRod',
      solids: [
        {
          outer: strip([boardEndU + 0.4, 0], [nutU - 0.3, 0], 0.13),
          z0: z1,
          z1: z1 + 0.07,
          hatch: false,
        },
        {
          outer: circle(nutU - 0.3, 0, 0.14, 10),
          z0: z1,
          z1: z1 + 0.11,
          hatch: false,
        },
      ],
      explode: plus(explode, 0, 0, 1.3),
      hitPad: 0.2,
    },
    {
      id: 'fretboard',
      solids: [
        { outer: taper(spec, boardEndU), z0: z1, z1: top, hatch: false },
      ],
      features: { fretSpaces },
      explode: plus(explode, 0, 0, 2.5),
    },
    {
      id: 'markers',
      solids: markers,
      explode: plus(explode, 0, 0, 3.5),
      hitPad: 0.2,
    },
    {
      id: 'frets',
      solids: frets,
      explode: plus(explode, 0, 0, 4.3),
      hitPad: 0.1,
    },
    {
      id: 'nut',
      solids: [
        {
          outer: strip(
            [nutU, -spec.halfNut - 0.01],
            [nutU, spec.halfNut + 0.01],
            0.16,
          ),
          z0: z1,
          z1: top + 0.11,
          hatch: false,
        },
      ],
      explode: plus(explode, 1.1, 0, 3.1),
      hitPad: 0.25,
    },
  ];
  return hasRod ? all : all.filter((part) => part.id !== 'trussRod');
}

/** The words for those layers, which are the same on every instrument. */
export function neckTerms({
  group,
  anchor,
  lift,
  follow,
  stringTree = false,
  fretSpaces = false,
  trussRod = true,
}: {
  /** Every part of the neck, which rise together as "Neck". */
  group: readonly string[];
  anchor: V3;
  lift: V3;
  /** Parts mounted on the headstock, which go where it goes. */
  follow: readonly string[];
  stringTree?: boolean;
  /** Name the gaps between the frets too. */
  fretSpaces?: boolean;
  trussRod?: boolean;
}): TermDef[] {
  const headLift: V3 = [1.6, 0, 1.4];
  return [
    { id: 'neck', name: 'Neck', family: 'neck', parts: group, lift, anchor },
    {
      id: 'headstock',
      name: 'Headstock',
      family: 'neck',
      parts: ['headstock'],
      lift: headLift,
      reveal: Object.fromEntries(follow.map((id) => [id, headLift])),
    },
    {
      id: 'tuningPegs',
      name: 'Tuning Pegs',
      family: 'neck',
      parts: ['tuners'],
      lift: [0, 0, 2.2],
    },
    ...(stringTree
      ? [
          {
            id: 'stringTree',
            name: 'String Tree',
            family: 'neck' as const,
            parts: ['stringTree'],
            lift: [0, 0, 2] as V3,
          },
        ]
      : []),
    {
      id: 'nut',
      name: 'Nut',
      family: 'neck',
      parts: ['nut'],
      lift: [0.6, 0, 1.9],
    },
    {
      id: 'fretboard',
      name: 'Fretboard',
      family: 'neck',
      parts: ['fretboard'],
      lift: [0, 0, 2.2],
      reveal: { markers: [0, 0, 2.2], frets: [0, 0, 2.2], nut: [0, 0, 2.2] },
    },
    {
      id: 'frets',
      name: 'Frets',
      family: 'neck',
      parts: ['frets'],
      lift: [0, 0, 1.8],
    },
    ...(fretSpaces
      ? [
          {
            id: 'fretSpaces',
            name: 'Fret Spaces',
            family: 'neck' as const,
            parts: ['fretboard'],
            feature: 'fretSpaces',
            lift: [0, 0, 0] as V3,
          },
        ]
      : []),
    {
      id: 'fretMarkers',
      name: 'Fret Markers',
      family: 'neck',
      parts: ['markers'],
      lift: [0, 0, 1.4],
      reveal: { frets: [0, 0, 2.6] },
    },
    ...(trussRod
      ? ([
          {
            id: 'trussRod',
            name: 'Truss Rod',
            family: 'neck',
            parts: ['trussRod'],
            lift: [0, 0, 1.2],
            reveal: {
              fretboard: [0, 0, 3.2],
              markers: [0, 0, 3.2],
              frets: [0, 0, 3.2],
              nut: [0, 0, 3.2],
            },
          },
        ] satisfies TermDef[])
      : []),
  ];
}

/** Where a closed outline's edge is on one side, at a point along it. */
export function edgeAt(
  outline: readonly V2[],
  u: number,
  side: 'bass' | 'treble',
): number {
  const hits: number[] = [];
  outline.forEach((a, i) => {
    const b = outline[(i + 1) % outline.length];
    if (a[0] <= u === b[0] <= u) return;
    hits.push(a[1] + ((u - a[0]) / (b[0] - a[0])) * (b[1] - a[1]));
  });
  return side === 'bass' ? Math.min(...hits) : Math.max(...hits);
}
