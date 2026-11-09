import type { InstrumentModel, PartDef, TermDef } from './anatomyTypes';
import {
  circle,
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
  NECK_PART_IDS,
  neckParts,
  neckTerms,
  type NeckSpec,
} from './neckGeometry';

// ── The electric guitar ────────────────────────────────────────────────────
// Our own double-cutaway solid body with a six-in-line headstock, drawn from
// its real proportions in inches: a 25.5" scale, a 1.75" slab, the butt of the
// body at u = 0. The saddles are at u = 6, so the nut is at 31.5.

const BRIDGE_U = 6;
const SCALE = 25.5;
const NUT_U = BRIDGE_U + SCALE;
const BODY_DEPTH = 1.75;

const BODY = sampleOutline(`
  M 0 0
  C 0 2.7, 0.9 5.4, 3.6 6.2
  C 5.6 6.75, 8.0 5.6, 10.2 4.85
  C 11.4 4.45, 12.4 4.7, 13.4 5.3
  C 14.4 5.85, 15.9 6.05, 16.4 5.5
  C 16.75 5.05, 15.6 4.35, 14.7 3.6
  C 14.0 3.0, 13.6 2.3, 14.1 1.7
  C 14.35 1.35, 15.0 1.15, 15.7 1.12
  L 15.7 -1.12
  C 16.2 -1.25, 16.3 -1.75, 16.0 -2.35
  C 15.75 -2.9, 16.5 -3.6, 17.4 -4.0
  C 18.1 -4.35, 18.6 -4.9, 18.2 -5.4
  C 17.7 -6.0, 15.8 -5.95, 14.4 -5.6
  C 12.9 -5.2, 11.6 -4.6, 10.4 -4.6
  C 8.4 -4.6, 6.9 -6.3, 4.4 -6.5
  C 1.4 -6.7, 0 -3.2, 0 0
  Z
`);

const POCKET = roundedRect(13.3, 0, 2.4, 1.14, 0.1);

const GUARD = sampleOutline(`
  M 14.6 1.2
  C 14.0 2.0, 13.5 2.6, 12.9 3.0
  C 11.7 3.9, 9.9 4.1, 8.0 4.8
  C 6.5 5.35, 4.6 5.4, 3.7 4.7
  C 3.0 4.1, 3.5 3.2, 4.6 2.6
  C 5.6 2.1, 6.3 1.75, 6.95 1.6
  L 6.95 -1.7
  C 8.3 -2.6, 9.6 -2.6, 10.8 -2.5
  C 12.2 -2.4, 14.0 -2.6, 14.7 -2.0
  C 15.1 -1.6, 15.0 -1.3, 14.7 -1.2
  L 12.95 -1.2
  L 12.95 1.2
  Z
`);

const PICKUP_U = { neck: 12.38, middle: 9.88, bridge: 7.6 } as const;
const BRIDGE_PICKUP_TURN = -0.14;

const pickupOutline = (u: number, turn = 0, pad = 0) =>
  roundedRect(u, 0, 0.34 + pad, 1.4 + pad, 0.3, turn);

const GUARD_HOLES = [
  pickupOutline(PICKUP_U.neck, 0, 0.03),
  pickupOutline(PICKUP_U.middle, 0, 0.03),
  pickupOutline(PICKUP_U.bridge, BRIDGE_PICKUP_TURN, 0.03),
];

const GUARD_TOP = BODY_DEPTH + 0.11;

function pickup(id: string, u: number, turn: number, explode: V3): PartDef {
  const poles = [-1, -0.6, -0.2, 0.2, 0.6, 1].map((k): V3[] => {
    const cu = u - Math.sin(turn) * k;
    const cv = Math.cos(turn) * k;
    return ringMarks(cu, cv, 0.07, GUARD_TOP + 0.26, 8);
  });
  return {
    id,
    solids: [
      {
        outer: pickupOutline(u, turn),
        z0: GUARD_TOP,
        z1: GUARD_TOP + 0.26,
        hatch: false,
      },
    ],
    marks: poles,
    explode,
    hitPad: 0.1,
  };
}

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

const VOLUME: V2 = [7.1, 3.05];
const TONES: readonly V2[] = [
  [5.6, 3.65],
  [4.3, 4.3],
];

const neckSpec: NeckSpec = {
  nutU: NUT_U,
  scale: SCALE,
  fretCount: 22,
  boardEndU: 12.85,
  heelU: 12.9,
  halfNut: 0.825,
  halfEnd: 1.1,
  z0: BODY_DEPTH - 0.4,
  z1: BODY_DEPTH + 0.2,
  explode: [5.4, 0, 1.2],
};
const NECK_TOP = neckSpec.z1;
const BOARD_TOP = boardTop(neckSpec);

const HEAD = sampleOutline(`
  M ${NUT_U} 0.825
  C ${NUT_U + 0.7} 0.9, ${NUT_U + 1.5} 1.05, ${NUT_U + 2.5} 1.0
  C ${NUT_U + 4.5} 0.95, ${NUT_U + 6.1} 0.8, ${NUT_U + 7.1} 0.35
  C ${NUT_U + 7.8} 0.0, ${NUT_U + 7.9} -0.7, ${NUT_U + 7.4} -1.0
  C ${NUT_U + 6.8} -1.35, ${NUT_U + 6.2} -1.1, ${NUT_U + 5.8} -1.25
  C ${NUT_U + 5.0} -1.55, ${NUT_U + 3.9} -1.9, ${NUT_U + 2.7} -1.85
  C ${NUT_U + 1.6} -1.8, ${NUT_U + 0.9} -1.1, ${NUT_U} -0.825
  Z
`);

/** The six posts, low E nearest the nut, high E at the tip. */
const POSTS: readonly V2[] = Array.from(
  { length: 6 },
  (_, i): V2 => [NUT_U + 1.35 + i * 0.93, -0.5 + i * 0.05],
);

const tunerSolids = (): Solid[] =>
  POSTS.flatMap(([u, v]): Solid[] => {
    const edge = edgeAt(HEAD, u, 'bass');
    return [
      {
        outer: circle(u, v, 0.17, 12),
        z0: NECK_TOP,
        z1: NECK_TOP + 0.06,
        hatch: false,
      },
      {
        outer: circle(u, v, 0.1, 10),
        z0: NECK_TOP + 0.06,
        z1: NECK_TOP + 0.56,
        hatch: false,
      },
      {
        outer: strip([u, edge + 0.12], [u, edge - 0.32], 0.1),
        z0: NECK_TOP - 0.3,
        z1: NECK_TOP - 0.2,
        hatch: false,
      },
      {
        outer: roundedRect(u, edge - 0.48, 0.27, 0.15, 0.12),
        z0: NECK_TOP - 0.38,
        z1: NECK_TOP - 0.12,
        hatch: false,
      },
    ];
  });

/** At the bridge the strings spread wider than at the nut; low E is on the
 *  bass side, string index 0 here. */
const stringLines = (): V3[][] => {
  const saddleZ = BODY_DEPTH + 0.46;
  const nutZ = BOARD_TOP + 0.12;
  return POSTS.map(([postU, postV], i): V3[] => {
    const k = (i - 2.5) / 2.5;
    return [
      [BRIDGE_U - 0.95, k * 1.02, BODY_DEPTH + 0.2],
      [BRIDGE_U + 0.02 * (i - 2.5), k * 1.02, saddleZ],
      [NUT_U, k * 0.69, nutZ],
      [postU, postV, NECK_TOP + 0.46],
    ];
  });
};

const STRING_TREE: V2 = [NUT_U + 2.55, 0.08];

const JACK_U = 5.6;
const JACK_V = edgeAt(BODY, JACK_U, 'treble');

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
        outer: circle(17.8, -5.0, 0.17, 12),
        z0: BODY_DEPTH,
        z1: BODY_DEPTH + 0.2,
        hatch: false,
      },
    ],
    explode: [0, 0, 1.3],
    hitPad: 0.35,
  },
  {
    id: 'outputJack',
    solids: [
      {
        outer: roundedRect(JACK_U, JACK_V + 0.04, 0.72, 0.1, 0.05),
        z0: 0.32,
        z1: 1.43,
        hatch: false,
      },
    ],
    marks: [
      circle(JACK_U, 0, 0.26, 14).map(
        ([u, v]): V3 => [u, JACK_V + 0.14, 0.87 + v],
      ),
    ],
    explode: [0, 2.4, 0],
    hitPad: 0.3,
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
    explode: [0, 0, 2.6],
  },
  {
    id: 'bridge',
    solids: [
      {
        outer: roundedRect(BRIDGE_U - 0.3, 0, 0.98, 1.45, 0.1),
        z0: BODY_DEPTH,
        z1: BODY_DEPTH + 0.12,
        hatch: false,
      },
    ],
    marks: [-1.1, -0.66, -0.22, 0.22, 0.66, 1.1].map((v): V3[] =>
      circle(BRIDGE_U + 0.52, v, 0.05, 8).map(
        ([a, b]): V3 => [a, b, BODY_DEPTH + 0.12],
      ),
    ),
    explode: [-2.2, -0.4, 1.8],
  },
  {
    id: 'saddles',
    solids: [-2.5, -1.5, -0.5, 0.5, 1.5, 2.5].map((k) => ({
      outer: roundedRect(BRIDGE_U + k * 0.02, k * 0.41, 0.3, 0.16, 0.05),
      z0: BODY_DEPTH + 0.12,
      z1: BODY_DEPTH + 0.42,
      hatch: false,
    })),
    explode: [-2.2, -0.4, 3],
    hitPad: 0.15,
  },
  {
    id: 'tremoloArm',
    solids: [
      {
        outer: strip([4.95, 1.25], [3.0, 2.15], 0.1),
        z0: BODY_DEPTH + 0.5,
        z1: BODY_DEPTH + 0.58,
        hatch: false,
      },
      {
        outer: circle(4.95, 1.25, 0.1, 10),
        z0: BODY_DEPTH + 0.1,
        z1: BODY_DEPTH + 0.58,
        hatch: false,
      },
      {
        outer: circle(3.0, 2.15, 0.1, 10),
        z0: BODY_DEPTH + 0.5,
        z1: BODY_DEPTH + 0.62,
        hatch: false,
      },
    ],
    explode: [-3.2, 2.2, 2.6],
    hitPad: 0.3,
  },
  {
    id: 'selector',
    solids: [
      {
        outer: roundedRect(9.05, 2.65, 0.56, 0.1, 0.05, -0.28),
        z0: GUARD_TOP,
        z1: GUARD_TOP + 0.03,
        hatch: false,
      },
      {
        outer: circle(9.05, 2.65, 0.06, 8),
        z0: GUARD_TOP,
        z1: GUARD_TOP + 0.3,
        hatch: false,
      },
      {
        outer: roundedRect(9.05, 2.65, 0.16, 0.09, 0.06),
        z0: GUARD_TOP + 0.3,
        z1: GUARD_TOP + 0.44,
        hatch: false,
      },
    ],
    stacked: true,
    explode: [0, 2.8, 3.4],
    hitPad: 0.3,
  },
  {
    id: 'volume',
    solids: knobSolids(VOLUME[0], VOLUME[1]),
    marks: [knobTick(VOLUME[0], VOLUME[1])],
    stacked: true,
    explode: [0, 2.8, 3.8],
    hitPad: 0.1,
  },
  {
    id: 'tone',
    solids: TONES.flatMap(([u, v]) => knobSolids(u, v)),
    marks: TONES.map(([u, v]) => knobTick(u, v)),
    stacked: true,
    explode: [0, 2.8, 3.8],
    hitPad: 0.1,
  },
  pickup('bridgePickup', PICKUP_U.bridge, BRIDGE_PICKUP_TURN, [0, -2.2, 5.2]),
  pickup('middlePickup', PICKUP_U.middle, 0, [0, -2.2, 5.2]),
  pickup('neckPickup', PICKUP_U.neck, 0, [0, -2.2, 5.2]),
  {
    id: 'headstock',
    solids: [{ outer: HEAD, z0: NECK_TOP - 0.5, z1: NECK_TOP }],
    explode: neckSpec.explode,
  },
  ...neckParts(neckSpec),
  {
    id: 'tuners',
    solids: tunerSolids(),
    explode: [5.4, 0, 3.2],
    hitPad: 0.08,
  },
  {
    id: 'stringTree',
    solids: [
      {
        outer: circle(STRING_TREE[0], STRING_TREE[1], 0.07, 8),
        z0: NECK_TOP,
        z1: NECK_TOP + 0.34,
        hatch: false,
      },
      {
        outer: roundedRect(STRING_TREE[0], STRING_TREE[1], 0.14, 0.27, 0.1),
        z0: NECK_TOP + 0.34,
        z1: NECK_TOP + 0.4,
        hatch: false,
      },
    ],
    explode: [5.4, 0, 4.0],
    hitPad: 0.3,
  },
  {
    id: 'strings',
    solids: [],
    marks: stringLines(),
    explode: [1.6, -2.4, 6.4],
    hitPad: 0.12,
  },
];

const ids = (...list: string[]) => list;

/** Everything but `keep`, moved by one offset: clears the way to a part. */
const allBut = (keep: readonly string[], offset: V3) =>
  Object.fromEntries(
    parts.filter((p) => !keep.includes(p.id)).map((p) => [p.id, offset]),
  );

const NECK_GROUP = ids(...NECK_PART_IDS, 'headstock', 'tuners', 'stringTree');
const SLID_OUT: V3 = [6, 0, 1.2];

const terms: TermDef[] = [
  ...neckTerms({
    group: NECK_GROUP,
    anchor: [22, 0, neckSpec.z1],
    lift: [4.5, 0, 1.2],
    follow: ['tuners', 'stringTree'],
    stringTree: true,
  }),
  // Body
  {
    id: 'body',
    name: 'Body',
    family: 'body',
    parts: ids('body'),
    lift: [0, 0, 0],
    reveal: { ...allBut(ids('body'), [0, 0, 4]), ...slideNeck() },
  },
  {
    id: 'tonewood',
    name: 'Tonewood',
    family: 'body',
    parts: ids('body'),
    feature: 'grain',
    lift: [0, 0, 0],
    reveal: { ...allBut(ids('body'), [0, 0, 4]), ...slideNeck() },
  },
  {
    id: 'neckPocket',
    name: 'Neck Pocket',
    family: 'body',
    parts: ids('body'),
    feature: 'pocket',
    lift: [0, 0, 0],
    reveal: slideNeck(),
    anchor: [13.3, 0, BODY_DEPTH],
  },
  {
    id: 'pickguard',
    name: 'Pickguard',
    family: 'body',
    parts: ids('pickguard'),
    lift: [0, 0, 2.2],
    reveal: {
      neckPickup: [0, 0, 2.2],
      middlePickup: [0, 0, 2.2],
      bridgePickup: [0, 0, 2.2],
      selector: [0, 0, 2.2],
      volume: [0, 0, 2.2],
      tone: [0, 0, 2.2],
    },
  },
  {
    id: 'strapButtons',
    name: 'Strap Buttons',
    family: 'body',
    parts: ids('strapButtons'),
    lift: [0, 0, 1.3],
  },
  // Electronics
  {
    id: 'pickups',
    name: 'Pickups',
    family: 'electronics',
    parts: ids('neckPickup', 'middlePickup', 'bridgePickup'),
    lift: [0, 0, 3],
    anchor: [PICKUP_U.middle, 0, GUARD_TOP + 0.26],
  },
  {
    id: 'neckPickup',
    name: 'Neck Pickup',
    family: 'electronics',
    parts: ids('neckPickup'),
    lift: [0, 0, 3],
  },
  {
    id: 'middlePickup',
    name: 'Middle Pickup',
    family: 'electronics',
    parts: ids('middlePickup'),
    lift: [0, 0, 3],
  },
  {
    id: 'bridgePickup',
    name: 'Bridge Pickup',
    family: 'electronics',
    parts: ids('bridgePickup'),
    lift: [0, 0, 3],
  },
  {
    id: 'pickupSelector',
    name: 'Pickup Selector',
    family: 'electronics',
    parts: ids('selector'),
    lift: [0, 0, 2.4],
  },
  {
    id: 'volume',
    name: 'Volume',
    family: 'electronics',
    parts: ids('volume'),
    lift: [0, 0, 2.4],
  },
  {
    id: 'tone',
    name: 'Tone',
    family: 'electronics',
    parts: ids('tone'),
    lift: [0, 0, 2.4],
  },
  {
    id: 'outputJack',
    name: 'Output Jack',
    family: 'electronics',
    parts: ids('outputJack'),
    lift: [0, 2.2, 0],
  },
  // Hardware
  {
    id: 'bridge',
    name: 'Bridge',
    family: 'hardware',
    parts: ids('bridge', 'saddles'),
    lift: [0, 0, 2.2],
  },
  {
    id: 'saddle',
    name: 'Saddles',
    family: 'hardware',
    parts: ids('saddles'),
    lift: [0, 0, 2.4],
    reveal: { bridge: [0, 0, 1] },
  },
  {
    id: 'tremoloArm',
    name: 'Tremolo Arm',
    family: 'hardware',
    parts: ids('tremoloArm'),
    lift: [-0.6, 0.8, 2.2],
  },
  {
    id: 'strings',
    name: 'Strings',
    family: 'hardware',
    parts: ids('strings'),
    lift: [0, 0, 3],
  },
];

function slideNeck(): Record<string, V3> {
  return Object.fromEntries(
    [...NECK_PART_IDS, 'headstock', 'tuners', 'stringTree'].map((id) => [
      id,
      SLID_OUT,
    ]),
  );
}

export const ELECTRIC_MODEL: InstrumentModel = {
  kind: 'electric',
  label: 'Electric',
  noun: 'guitar',
  accentKey: 'E',
  parts,
  terms,
  buildOrder: [
    { term: 'body', parts: ['body'] },
    { term: 'strapButtons', parts: ['strapButtons'] },
    { term: 'outputJack', parts: ['outputJack'] },
    { term: 'pickguard', parts: ['pickguard'] },
    { term: 'bridgePickup', parts: ['bridgePickup'] },
    { term: 'middlePickup', parts: ['middlePickup'] },
    { term: 'neckPickup', parts: ['neckPickup'] },
    { term: 'pickupSelector', parts: ['selector'] },
    { term: 'volume', parts: ['volume'] },
    { term: 'tone', parts: ['tone'] },
    { term: 'bridge', parts: ['bridge'] },
    { term: 'saddle', parts: ['saddles'] },
    { term: 'tremoloArm', parts: ['tremoloArm'] },
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
