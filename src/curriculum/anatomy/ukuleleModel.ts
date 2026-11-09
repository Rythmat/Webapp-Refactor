import type { InstrumentModel, PartDef, TermDef } from './anatomyTypes';
import {
  circle,
  hatchInside,
  mirrorHalf,
  ringMarks,
  roundedRect,
  sampleOutline,
  scaleAbout,
  strip,
  type Solid,
  type V2,
  type V3,
} from './iso';
import {
  boardTop,
  edgeAt,
  fretDistance,
  NECK_PART_IDS,
  neckParts,
  neckTerms,
  type NeckSpec,
} from './neckGeometry';

// ── The ukulele ────────────────────────────────────────────────────────────
// A concert ukulele, in real inches: a 15" scale, a 9.8" figure-eight body
// 2.75" deep, the neck joining at the 14th fret. What sets it apart from a small
// guitar: no truss rod, no pickguard, no bridge pins (its strings tie on), a
// light ladder of braces, and four nylon strings in re-entrant G C E A.
//
// Explode and lift distances are in drawn units (see drawScale), so it comes
// apart as far on the page as the larger instruments do.

const DRAW_SCALE = 1.6;

const SCALE = 15;
const BODY_LENGTH = 9.8;
const JOIN_FRET = 14;
const FRET_COUNT = 18;
const NUT_U = BODY_LENGTH + fretDistance(JOIN_FRET, SCALE);
const BRIDGE_U = NUT_U - SCALE;

const DEPTH = 2.75;
const BACK_TOP = 0.08;
const RIM_TOP = DEPTH - 0.08;
const TOP_FACE = DEPTH;

const OUTLINE = mirrorHalf(
  sampleOutline(`
    M 0 0
    C 0 2.0, 0.7 3.6, 2.6 3.85
    C 3.9 4.0, 4.6 3.0, 5.45 2.55
    C 5.95 2.35, 6.5 2.75, 7.1 3.0
    C 8.0 3.3, 9.1 2.8, 9.5 1.9
    C 9.75 1.25, 9.8 0.6, 9.8 0
  `),
);
const RIM_INNER = scaleAbout(OUTLINE, 4.9, 0, 0.97, 0.955);

const HOLE_U = 6.65;
const HOLE_R = 1;
const SOUND_HOLE = circle(HOLE_U, 0, HOLE_R, 36);
const ROSETTE_OUTER = circle(HOLE_U, 0, HOLE_R + 0.26, 36);
const ROSETTE_INNER = circle(HOLE_U, 0, HOLE_R + 0.04, 36);

const BRIDGE_TOP = TOP_FACE + 0.18;

const neckSpec: NeckSpec = {
  nutU: NUT_U,
  scale: SCALE,
  fretCount: FRET_COUNT,
  boardEndU: NUT_U - fretDistance(FRET_COUNT, SCALE) - 0.08,
  heelU: BODY_LENGTH - 1.1,
  halfNut: 0.69,
  halfEnd: 0.95,
  z0: TOP_FACE - 0.3,
  z1: TOP_FACE + 0.06,
  explode: [5.2, 0, 2.2],
  markerFrets: [5, 7, 10, 12, 15],
  doubleTwelfth: false,
  trussRod: false,
  fretWidth: 0.04,
};
const NECK_TOP = neckSpec.z1;
const BOARD_TOP = boardTop(neckSpec);

// A small head with a low crown across its top.
const HEAD = mirrorHalf(
  sampleOutline(`
    M ${NUT_U} 0.69
    C ${NUT_U + 0.4} 0.72, ${NUT_U + 0.8} 0.95, ${NUT_U + 1.2} 1.0
    C ${NUT_U + 2.0} 1.05, ${NUT_U + 2.8} 1.0, ${NUT_U + 3.3} 0.85
    C ${NUT_U + 3.55} 0.6, ${NUT_U + 3.45} 0.3, ${NUT_U + 3.75} 0
  `),
).concat([[NUT_U, -0.69] as V2]);

const POST_DISTANCES = [1.25, 2.55];
/** The bass-position side's posts, then the treble-position side's. */
const POSTS: readonly V2[] = [-1, 1].flatMap((side) =>
  POST_DISTANCES.map((d): V2 => [NUT_U + d, side * 0.5]),
);

const tunerSolids = (): Solid[] =>
  POSTS.flatMap(([u, v]): Solid[] => {
    const edge = edgeAt(HEAD, u, v < 0 ? 'bass' : 'treble');
    const out = v < 0 ? -1 : 1;
    return [
      {
        outer: circle(u, v, 0.13, 12),
        z0: NECK_TOP,
        z1: NECK_TOP + 0.04,
        hatch: false,
      },
      {
        outer: circle(u, v, 0.07, 10),
        z0: NECK_TOP + 0.04,
        z1: NECK_TOP + 0.34,
        hatch: false,
      },
      {
        outer: strip([u, edge - out * 0.06], [u, edge + out * 0.18], 0.06),
        z0: NECK_TOP - 0.18,
        z1: NECK_TOP - 0.12,
        hatch: false,
      },
      {
        outer: roundedRect(u, edge + out * 0.31, 0.17, 0.13, 0.1),
        z0: NECK_TOP - 0.22,
        z1: NECK_TOP - 0.08,
        hatch: false,
      },
    ];
  });

// Each string's place across the guitar: G, C, E, A from the top of the neck.
const ACROSS = [-1, -1 / 3, 1 / 3, 1];
const SADDLE_SPREAD = 0.62;
const NUT_SPREAD = 0.48;
const TIE_U = BRIDGE_U - 0.42;

/** From its knot at the tie block, over the saddle and nut, to its post. Each
 *  side's outer string goes to that side's furthest post. */
const stringLines = (): V3[][] =>
  ACROSS.map((k, i): V3[] => {
    const post = POSTS[i < 2 ? 1 - i : i];
    return [
      [TIE_U, k * SADDLE_SPREAD, BRIDGE_TOP + 0.02],
      [BRIDGE_U, k * SADDLE_SPREAD, BRIDGE_TOP + 0.13],
      [NUT_U, k * NUT_SPREAD, BOARD_TOP + 0.07],
      [post[0], post[1], NECK_TOP + 0.28],
    ];
  });

const BRACES: readonly (readonly [V2, V2, number])[] = [
  [[8.25, -2.5], [8.25, 2.5], 0.24],
  [[5.35, -2.2], [5.35, 2.2], 0.24],
  [[4.6, 0.95], [1.4, 1.35], 0.14],
  [[4.6, -0.95], [1.4, -1.35], 0.14],
];
const BRIDGE_PLATE = roundedRect(BRIDGE_U - 0.05, 0, 0.5, 1.3, 0.05);

const parts: PartDef[] = [
  {
    id: 'back',
    solids: [{ outer: OUTLINE, z0: 0, z1: BACK_TOP, hatch: false }],
    features: { grain: hatchInside(OUTLINE, [], BACK_TOP, 0.5, 0.05) },
    marks: [
      [
        [0.6, 0, BACK_TOP],
        [9.2, 0, BACK_TOP],
      ],
    ],
    explode: [0, 0, -2.6],
  },
  {
    id: 'sides',
    solids: [{ outer: OUTLINE, holes: [RIM_INNER], z0: BACK_TOP, z1: RIM_TOP }],
    explode: [0, 0, 0],
  },
  {
    id: 'bracing',
    solids: [
      ...BRACES.map(([a, b, width]) => ({
        outer: strip(a, b, width),
        z0: RIM_TOP - 0.16,
        z1: RIM_TOP,
        hatch: false,
      })),
      { outer: BRIDGE_PLATE, z0: RIM_TOP - 0.04, z1: RIM_TOP, hatch: false },
    ],
    explode: [0, 0, 1.7],
  },
  {
    id: 'top',
    solids: [
      {
        outer: OUTLINE,
        holes: [SOUND_HOLE],
        z0: RIM_TOP,
        z1: TOP_FACE,
        hatch: false,
      },
    ],
    features: {
      soundHole: [
        ringMarks(HOLE_U, 0, HOLE_R, TOP_FACE, 36),
        ringMarks(HOLE_U, 0, HOLE_R - 0.03, TOP_FACE, 36),
      ],
      grain: hatchInside(OUTLINE, [SOUND_HOLE], TOP_FACE, 0.5, 0.015),
    },
    explode: [0, 0, 3.5],
  },
  {
    id: 'rosette',
    solids: [
      {
        outer: ROSETTE_OUTER,
        holes: [ROSETTE_INNER],
        z0: TOP_FACE,
        z1: TOP_FACE + 0.01,
        hatch: false,
      },
    ],
    marks: [ringMarks(HOLE_U, 0, HOLE_R + 0.15, TOP_FACE + 0.01, 36)],
    explode: [0, -1.6, 5.2],
    hitPad: 0.1,
  },
  {
    id: 'bridge',
    solids: [
      {
        // The saddle's block and, behind it, the tie block the strings knot on.
        outer: roundedRect(BRIDGE_U - 0.16, 0, 0.42, 1.3, 0.1),
        z0: TOP_FACE,
        z1: BRIDGE_TOP,
        hatch: false,
      },
    ],
    marks: ACROSS.map((k) =>
      ringMarks(TIE_U, k * SADDLE_SPREAD, 0.05, BRIDGE_TOP, 8),
    ),
    explode: [-2.6, 0, 4.2],
  },
  {
    id: 'saddle',
    solids: [
      {
        outer: strip([BRIDGE_U, -0.95], [BRIDGE_U, 0.95], 0.07),
        z0: BRIDGE_TOP,
        z1: BRIDGE_TOP + 0.11,
        hatch: false,
      },
    ],
    explode: [-2.6, 0, 5.5],
    hitPad: 0.2,
  },
  {
    id: 'headstock',
    solids: [{ outer: HEAD, z0: NECK_TOP - 0.3, z1: NECK_TOP }],
    explode: neckSpec.explode,
  },
  ...neckParts(neckSpec),
  {
    id: 'tuners',
    solids: tunerSolids(),
    explode: [5.2, 0, 3.9],
    hitPad: 0.1,
  },
  {
    id: 'strings',
    solids: [],
    marks: stringLines(),
    explode: [1.4, -2.6, 8],
    hitPad: 0.12,
    lineWeight: 1.3,
  },
];

const NECK_GROUP = [
  ...NECK_PART_IDS.filter((id) => id !== 'trussRod'),
  'headstock',
  'tuners',
];
const SLID_OUT: V3 = [5.6, 0, 1.6];
const slideNeck = () =>
  Object.fromEntries(NECK_GROUP.map((id): [string, V3] => [id, SLID_OUT]));
const allBut = (keep: readonly string[], offset: V3) =>
  Object.fromEntries(
    parts
      .filter((p) => !keep.includes(p.id))
      .map((p): [string, V3] => [p.id, offset]),
  );
const OVER_TOP = ['rosette', 'bridge', 'saddle'];
const lifted = (ids: readonly string[], offset: V3) =>
  Object.fromEntries(ids.map((id): [string, V3] => [id, offset]));

const terms: TermDef[] = [
  ...neckTerms({
    group: NECK_GROUP,
    anchor: [13, 0, NECK_TOP],
    lift: [4, 0, 1.4],
    follow: ['tuners'],
    fretSpaces: true,
    trussRod: false,
  }),
  // Body
  {
    id: 'body',
    name: 'Body',
    family: 'body',
    parts: ['back', 'sides', 'top'],
    lift: [0, 0, 0],
    reveal: {
      ...allBut(['back', 'sides', 'top'], [0, 0, 3.4]),
      ...slideNeck(),
    },
  },
  {
    id: 'top',
    name: 'Top',
    family: 'body',
    parts: ['top'],
    lift: [0, 0, 3],
    reveal: lifted(OVER_TOP, [0, 0, 3]),
  },
  {
    id: 'soundHole',
    name: 'Sound Hole',
    family: 'body',
    parts: ['top'],
    feature: 'soundHole',
    lift: [0, 0, 1.6],
    reveal: lifted(OVER_TOP, [0, 0, 1.6]),
    anchor: [HOLE_U, HOLE_R, TOP_FACE],
  },
  {
    id: 'rosette',
    name: 'Rosette',
    family: 'body',
    parts: ['rosette'],
    lift: [0, 0, 2.2],
    anchor: [HOLE_U, HOLE_R + 0.15, TOP_FACE],
  },
  {
    id: 'bracing',
    name: 'Bracing',
    family: 'body',
    parts: ['bracing'],
    lift: [0, 0, 0],
    seeThrough: ['top', ...OVER_TOP, ...NECK_GROUP],
    anchor: [2.6, 1.6, RIM_TOP],
  },
  {
    id: 'backSides',
    name: 'Back & Sides',
    family: 'body',
    parts: ['back', 'sides'],
    lift: [0, 0, 0],
    reveal: {
      back: [0, 0, -2.2],
      ...allBut(['back', 'sides'], [0, 0, 3.4]),
      ...slideNeck(),
    },
  },
  {
    id: 'tonewood',
    name: 'Tonewood',
    family: 'body',
    parts: ['back', 'top'],
    feature: 'grain',
    lift: [0, 0, 0],
    reveal: {
      back: [0, 0, -2.2],
      top: [0, 0, 3.2],
      bracing: [0, 0, 1.6],
      ...lifted(OVER_TOP, [0, 0, 4.2]),
      ...slideNeck(),
    },
    anchor: [2.6, 1.6, TOP_FACE],
  },
  // Hardware
  {
    id: 'bridge',
    name: 'Bridge',
    family: 'hardware',
    parts: ['bridge', 'saddle'],
    lift: [0, 0, 2.2],
  },
  {
    id: 'saddle',
    name: 'Saddle',
    family: 'hardware',
    parts: ['saddle'],
    lift: [0, 0, 2.2],
    reveal: { bridge: [0, 0, 0.9] },
  },
  {
    id: 'strings',
    name: 'Strings',
    family: 'hardware',
    parts: ['strings'],
    lift: [0, 0, 3],
  },
];

export const UKULELE_MODEL: InstrumentModel = {
  kind: 'ukulele',
  label: 'Concert',
  noun: 'ukulele',
  // The key a ukulele is tuned to play in: its open strings make a C6 chord.
  accentKey: 'C',
  drawScale: DRAW_SCALE,
  parts,
  terms,
  buildOrder: [
    { term: 'backSides', name: 'Back', parts: ['back'] },
    { term: 'backSides', name: 'Sides', parts: ['sides'] },
    { term: 'bracing', parts: ['bracing'] },
    { term: 'top', parts: ['top'] },
    { term: 'rosette', parts: ['rosette'] },
    { term: 'bridge', parts: ['bridge'] },
    { term: 'saddle', parts: ['saddle'] },
    { term: 'neck', parts: ['neckShaft'] },
    { term: 'headstock', parts: ['headstock'] },
    { term: 'fretboard', parts: ['fretboard'] },
    { term: 'fretMarkers', parts: ['markers'] },
    { term: 'frets', parts: ['frets'] },
    { term: 'nut', parts: ['nut'] },
    { term: 'tuningPegs', parts: ['tuners'] },
    { term: 'strings', parts: ['strings'] },
  ],
};
