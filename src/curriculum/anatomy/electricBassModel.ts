import type { InstrumentModel, PartDef, TermDef } from './anatomyTypes';
import {
  circle,
  clover,
  hatchInside,
  ringMarks,
  roundedRect,
  sampleOutline,
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

// ── The electric bass ──────────────────────────────────────────────────────
// Our own curves, fitted to the proportions of the owner's reference photo, in
// inches: a 34" scale on a 1.75" slab, the butt of the body at u = 0. What makes
// it read as a bass and not a long guitar: the bridge right at the tail, a long
// finger of an upper horn over a short lower one, a slim neck far longer than
// the body, one split pickup, and one large pickguard that sweeps down to hold
// the controls.

const BRIDGE_U = 2.6;
const SCALE = 34;
const NUT_U = BRIDGE_U + SCALE;
const BODY_DEPTH = 1.75;

const BODY = sampleOutline(`
  M 0 0
  C 0 2.6, 1.6 5.4, 4.6 6.0
  C 6.4 6.35, 8.4 4.9, 9.9 4.25
  C 11.2 3.75, 12.6 4.5, 13.6 5.35
  C 14.3 5.85, 15.2 6.05, 15.35 5.6
  C 15.5 5.1, 14.5 4.35, 13.9 3.75
  C 13.4 3.2, 13.35 2.35, 13.8 1.85
  C 14.1 1.5, 14.6 1.3, 15.3 1.26
  L 15.3 -1.26
  C 15.7 -1.4, 15.4 -2.0, 15.15 -2.5
  C 14.95 -3.0, 16.2 -3.1, 17.3 -3.4
  C 18.2 -3.65, 19.2 -3.9, 19.2 -4.6
  C 19.2 -5.2, 18.4 -5.4, 17.6 -5.25
  C 16.0 -5.0, 12.2 -4.6, 10.1 -4.4
  C 8.2 -4.5, 7.0 -6.1, 4.8 -6.3
  C 1.7 -6.6, 0 -2.9, 0 0
  Z
`);

const POCKET = roundedRect(14.25, 0, 1.05, 1.24, 0.1);

// One plate: a wide chest around the pickup with a wing either side of the
// neck, sweeping in an S down the treble side to a lobe for the controls.
const GUARD = sampleOutline(`
  M 13.25 1.26
  C 12.9 1.9, 12.6 3.2, 12.15 4.45
  C 11.3 3.7, 10.3 3.1, 9.75 3.2
  C 8.7 3.3, 8.0 3.2, 7.25 3.55
  C 6.5 3.9, 5.4 5.0, 4.75 5.45
  C 4.2 5.75, 3.7 5.75, 3.4 5.6
  C 2.8 5.3, 2.2 4.8, 1.75 4.25
  C 1.45 3.85, 1.2 3.2, 1.2 2.75
  C 2.0 3.05, 2.9 3.6, 3.5 3.45
  C 4.2 3.2, 4.8 2.3, 5.3 1.85
  C 5.5 1.6, 5.5 -1.5, 5.3 -1.75
  C 5.6 -2.4, 6.0 -2.8, 6.3 -2.95
  C 7.2 -3.2, 8.3 -3.2, 8.75 -3.1
  C 9.8 -2.8, 10.6 -2.4, 11.25 -2.3
  C 11.9 -2.3, 12.6 -2.6, 13.15 -2.8
  C 13.3 -2.3, 13.3 -1.75, 13.25 -1.26
  Z
`);

const GUARD_TOP = BODY_DEPTH + 0.11;

// The split pickup: the E and A half nearer the neck, the D and G half nearer
// the bridge, as it is traditionally mounted and as the reference shows.
const SPLIT_U = 7.65;
const SPLIT_STAGGER = 0.58;
const SPLIT_HALF: readonly (readonly [number, number])[] = [
  [SPLIT_U + SPLIT_STAGGER, -0.72],
  [SPLIT_U - SPLIT_STAGGER, 0.72],
];
const splitOutline = ([u, v]: readonly [number, number], pad = 0) =>
  roundedRect(u, v, 0.34 + pad, 0.84 + pad, 0.14);

const GUARD_HOLES = SPLIT_HALF.map((half) => splitOutline(half, 0.03));

const VOLUME: V2 = [5.5, 3.9];
const TONE: V2 = [3.95, 4.6];
const JACK: V2 = [2.5, 3.95];

const knobSolids = (u: number, v: number): Solid[] => [
  {
    outer: circle(u, v, 0.44, 22),
    z0: GUARD_TOP,
    z1: GUARD_TOP + 0.1,
    hatch: false,
  },
  { outer: circle(u, v, 0.34, 22), z0: GUARD_TOP + 0.1, z1: GUARD_TOP + 0.56 },
];
const knobTick = (u: number, v: number): V3[] => [
  [u - 0.08, v + 0.25, GUARD_TOP + 0.56],
  [u - 0.03, v + 0.1, GUARD_TOP + 0.56],
];

const FRETS = 20;
const neckSpec: NeckSpec = {
  nutU: NUT_U,
  scale: SCALE,
  fretCount: FRETS,
  boardEndU: NUT_U - fretDistance(FRETS, SCALE) - 0.15,
  heelU: 13.2,
  halfNut: 0.77,
  halfEnd: 1.2,
  z0: BODY_DEPTH - 0.4,
  z1: BODY_DEPTH + 0.2,
  explode: [6.4, 0, 1.2],
};
const NECK_TOP = neckSpec.z1;
const BOARD_TOP = boardTop(neckSpec);

// A long paddle, a little proud on the treble side.
const HEAD = sampleOutline(`
  M ${NUT_U} 0.77
  C ${NUT_U + 0.9} 0.95, ${NUT_U + 1.7} 1.35, ${NUT_U + 2.8} 1.35
  C ${NUT_U + 4.6} 1.35, ${NUT_U + 6.4} 1.15, ${NUT_U + 7.6} 0.85
  C ${NUT_U + 8.3} 0.65, ${NUT_U + 8.7} 0.2, ${NUT_U + 8.65} -0.25
  C ${NUT_U + 8.6} -0.7, ${NUT_U + 8.1} -0.95, ${NUT_U + 7.6} -0.9
  C ${NUT_U + 6} -1.2, ${NUT_U + 4} -1.45, ${NUT_U + 2.4} -1.35
  C ${NUT_U + 1.5} -1.25, ${NUT_U + 0.8} -0.95, ${NUT_U} -0.77
  Z
`);

/** The four posts: the low E nearest the nut, the G at the tip. */
const POSTS: readonly V2[] = Array.from(
  { length: 4 },
  (_, i): V2 => [NUT_U + 1.85 + i * 1.6, -0.6 + i * 0.1],
);

const tunerSolids = (): Solid[] =>
  POSTS.flatMap(([u, v]): Solid[] => {
    const edge = edgeAt(HEAD, u, 'bass');
    return [
      {
        outer: circle(u, v, 0.24, 12),
        z0: NECK_TOP,
        z1: NECK_TOP + 0.06,
        hatch: false,
      },
      {
        outer: circle(u, v, 0.15, 10),
        z0: NECK_TOP + 0.06,
        z1: NECK_TOP + 0.6,
        hatch: false,
      },
      {
        outer: strip([u, edge + 0.12], [u, edge - 0.4], 0.13),
        z0: NECK_TOP - 0.3,
        z1: NECK_TOP - 0.18,
        hatch: false,
      },
      {
        // A bass's large clover key: it has thick strings to turn.
        outer: clover(u, edge - 0.82, 0.6),
        z0: NECK_TOP - 0.38,
        z1: NECK_TOP - 0.12,
        hatch: false,
      },
    ];
  });

const SADDLE_SPREAD = 0.93;
const NUT_SPREAD = 0.53;

/** Low E on the bass side, string index 0. */
const stringLines = (): V3[][] => {
  const saddleZ = BODY_DEPTH + 0.5;
  const nutZ = BOARD_TOP + 0.12;
  return POSTS.map(([postU, postV], i): V3[] => {
    const k = (i - 1.5) / 1.5;
    return [
      [BRIDGE_U - 0.8, k * SADDLE_SPREAD, BODY_DEPTH + 0.22],
      [BRIDGE_U, k * SADDLE_SPREAD, saddleZ],
      [NUT_U, k * NUT_SPREAD, nutZ],
      [postU, postV, NECK_TOP + 0.48],
    ];
  });
};

const STRING_TREE: V2 = [NUT_U + 4.2, -0.02];

const parts: PartDef[] = [
  {
    id: 'body',
    solids: [{ outer: BODY, z0: 0, z1: BODY_DEPTH }],
    marks: [[...POCKET, POCKET[0]].map(([u, v]): V3 => [u, v, BODY_DEPTH])],
    features: {
      pocket: [[...POCKET, POCKET[0]].map(([u, v]): V3 => [u, v, BODY_DEPTH])],
      grain: hatchInside(BODY, [], BODY_DEPTH, 0.8, 0.07),
    },
    explode: [0, 0, 0],
  },
  {
    id: 'strapButtons',
    solids: [
      {
        outer: circle(-0.02, 0, 0.17, 12),
        z0: BODY_DEPTH * 0.5,
        z1: BODY_DEPTH * 0.5 + 0.28,
        hatch: false,
      },
      {
        outer: circle(18.75, -4.65, 0.17, 12),
        z0: BODY_DEPTH,
        z1: BODY_DEPTH + 0.2,
        hatch: false,
      },
    ],
    explode: [0, 0, 1.3],
    hitPad: 0.35,
  },
  {
    id: 'pickguard',
    solids: [
      {
        outer: GUARD,
        holes: GUARD_HOLES,
        z0: BODY_DEPTH,
        z1: GUARD_TOP,
        hatch: false,
      },
    ],
    marks: hatchInside(GUARD, GUARD_HOLES, GUARD_TOP, 0.36, 0.58),
    explode: [0, 0, 2.8],
  },
  {
    id: 'bridge',
    solids: [
      {
        outer: roundedRect(BRIDGE_U - 0.25, 0, 0.92, 1.28, 0.06),
        z0: BODY_DEPTH,
        z1: BODY_DEPTH + 0.14,
        hatch: false,
      },
    ],
    marks: [-0.93, -0.31, 0.31, 0.93].map((v) =>
      ringMarks(BRIDGE_U - 0.8, v, 0.07, BODY_DEPTH + 0.14, 8),
    ),
    explode: [-2.6, 0, 1.4],
  },
  {
    id: 'saddles',
    solids: [-1.5, -0.5, 0.5, 1.5].map((k) => ({
      outer: roundedRect(BRIDGE_U, (k / 1.5) * SADDLE_SPREAD, 0.4, 0.22, 0.05),
      z0: BODY_DEPTH + 0.14,
      z1: BODY_DEPTH + 0.46,
      hatch: false,
    })),
    explode: [-2.6, 0, 2.6],
    hitPad: 0.15,
  },
  {
    id: 'pickup',
    solids: SPLIT_HALF.map((half) => ({
      outer: splitOutline(half),
      z0: GUARD_TOP,
      z1: GUARD_TOP + 0.3,
      hatch: false,
    })),
    marks: SPLIT_HALF.flatMap(([u, v]) =>
      [-0.54, -0.18, 0.18, 0.54].map((d) =>
        ringMarks(u, v + d, 0.07, GUARD_TOP + 0.3, 8),
      ),
    ),
    explode: [0, -1.4, 5.6],
    hitPad: 0.1,
  },
  {
    id: 'volume',
    solids: knobSolids(VOLUME[0], VOLUME[1]),
    marks: [knobTick(VOLUME[0], VOLUME[1])],
    stacked: true,
    explode: [0, 2.6, 4.2],
    hitPad: 0.1,
  },
  {
    id: 'tone',
    solids: knobSolids(TONE[0], TONE[1]),
    marks: [knobTick(TONE[0], TONE[1])],
    stacked: true,
    explode: [0, 2.6, 4.2],
    hitPad: 0.1,
  },
  {
    id: 'outputJack',
    solids: [
      {
        outer: circle(JACK[0], JACK[1], 0.3, 14),
        z0: GUARD_TOP,
        z1: GUARD_TOP + 0.08,
        hatch: false,
      },
    ],
    marks: [ringMarks(JACK[0], JACK[1], 0.14, GUARD_TOP + 0.08, 10)],
    explode: [0, 2.6, 4.2],
    hitPad: 0.25,
  },
  {
    id: 'headstock',
    solids: [{ outer: HEAD, z0: NECK_TOP - 0.5, z1: NECK_TOP }],
    explode: neckSpec.explode,
  },
  ...neckParts(neckSpec),
  {
    id: 'tuners',
    solids: tunerSolids(),
    explode: [6.4, 0, 3.2],
    hitPad: 0.08,
  },
  {
    id: 'stringTree',
    solids: [
      {
        outer: circle(STRING_TREE[0], STRING_TREE[1], 0.08, 8),
        z0: NECK_TOP,
        z1: NECK_TOP + 0.34,
        hatch: false,
      },
      {
        outer: roundedRect(STRING_TREE[0], STRING_TREE[1], 0.15, 0.3, 0.1),
        z0: NECK_TOP + 0.34,
        z1: NECK_TOP + 0.4,
        hatch: false,
      },
    ],
    explode: [6.4, 0, 4],
    hitPad: 0.3,
  },
  {
    id: 'strings',
    solids: [],
    marks: stringLines(),
    explode: [1.6, -2.8, 7.4],
    hitPad: 0.14,
    lineWeight: 2.2,
  },
];

const NECK_GROUP = [...NECK_PART_IDS, 'headstock', 'tuners', 'stringTree'];
const SLID_OUT: V3 = [7, 0, 1.2];
const slideNeck = () =>
  Object.fromEntries(NECK_GROUP.map((id): [string, V3] => [id, SLID_OUT]));
const allBut = (keep: readonly string[], offset: V3) =>
  Object.fromEntries(
    parts
      .filter((p) => !keep.includes(p.id))
      .map((p): [string, V3] => [p.id, offset]),
  );

const terms: TermDef[] = [
  ...neckTerms({
    group: NECK_GROUP,
    anchor: [24, 0, NECK_TOP],
    lift: [4.5, 0, 1.2],
    follow: ['tuners', 'stringTree'],
    stringTree: true,
    fretSpaces: true,
  }),
  // Body
  {
    id: 'body',
    name: 'Body',
    family: 'body',
    parts: ['body'],
    lift: [0, 0, 0],
    reveal: { ...allBut(['body'], [0, 0, 4]), ...slideNeck() },
  },
  {
    id: 'tonewood',
    name: 'Tonewood',
    family: 'body',
    parts: ['body'],
    feature: 'grain',
    lift: [0, 0, 0],
    reveal: { ...allBut(['body'], [0, 0, 4]), ...slideNeck() },
  },
  {
    id: 'neckPocket',
    name: 'Neck Pocket',
    family: 'body',
    parts: ['body'],
    feature: 'pocket',
    lift: [0, 0, 0],
    reveal: slideNeck(),
    anchor: [14.25, 0, BODY_DEPTH],
  },
  {
    id: 'pickguard',
    name: 'Pickguard',
    family: 'body',
    parts: ['pickguard'],
    lift: [0, 0, 2.2],
    reveal: {
      pickup: [0, 0, 2.2],
      volume: [0, 0, 2.2],
      tone: [0, 0, 2.2],
      outputJack: [0, 0, 2.2],
    },
  },
  {
    id: 'strapButtons',
    name: 'Strap Buttons',
    family: 'body',
    parts: ['strapButtons'],
    lift: [0, 0, 1.3],
  },
  // Electronics
  {
    id: 'pickup',
    name: 'Pickup',
    family: 'electronics',
    parts: ['pickup'],
    lift: [0, 0, 3],
    anchor: [SPLIT_U, 0, GUARD_TOP + 0.3],
  },
  {
    id: 'volume',
    name: 'Volume',
    family: 'electronics',
    parts: ['volume'],
    lift: [0, 0, 2.4],
  },
  {
    id: 'tone',
    name: 'Tone',
    family: 'electronics',
    parts: ['tone'],
    lift: [0, 0, 2.4],
  },
  {
    id: 'outputJack',
    name: 'Output Jack',
    family: 'electronics',
    parts: ['outputJack'],
    lift: [0, 0, 2],
  },
  // Hardware
  {
    id: 'bridge',
    name: 'Bridge',
    family: 'hardware',
    parts: ['bridge', 'saddles'],
    lift: [0, 0, 2.2],
  },
  {
    id: 'saddle',
    name: 'Saddles',
    family: 'hardware',
    parts: ['saddles'],
    lift: [0, 0, 2.4],
    reveal: { bridge: [0, 0, 1] },
  },
  {
    id: 'strings',
    name: 'Strings',
    family: 'hardware',
    parts: ['strings'],
    lift: [0, 0, 3],
  },
];

export const ELECTRIC_BASS_MODEL: InstrumentModel = {
  kind: 'electricBass',
  label: 'Electric',
  noun: 'bass',
  accentKey: 'E',
  parts,
  terms,
  buildOrder: [
    { term: 'body', parts: ['body'] },
    { term: 'strapButtons', parts: ['strapButtons'] },
    { term: 'pickguard', parts: ['pickguard'] },
    { term: 'pickup', parts: ['pickup'] },
    { term: 'volume', parts: ['volume'] },
    { term: 'tone', parts: ['tone'] },
    { term: 'outputJack', parts: ['outputJack'] },
    { term: 'bridge', parts: ['bridge'] },
    { term: 'saddle', parts: ['saddles'] },
    { term: 'neck', parts: ['neckShaft'] },
    { term: 'headstock', parts: ['headstock'] },
    { term: 'trussRod', parts: ['trussRod'] },
    { term: 'fretboard', parts: ['fretboard'] },
    { term: 'fretMarkers', parts: ['markers'] },
    { term: 'frets', parts: ['frets'] },
    { term: 'nut', parts: ['nut'] },
    { term: 'tuningPegs', parts: ['tuners'] },
    { term: 'stringTree', parts: ['stringTree'] },
    { term: 'strings', parts: ['strings'] },
  ],
};
