import type { InstrumentModel, PartDef, TermDef } from './anatomyTypes';
import {
  circle,
  curvedBar,
  ringBand,
  roundedRect,
  sampleOutline,
  strip,
  type Solid,
  type Tilt,
  type V2,
  type V3,
} from './iso';
import {
  blackKeySolids,
  noteOffsets,
  whiteKeySolids,
  KEYBOARD_HALF,
} from './pianoKeys';

// ── The grand piano ────────────────────────────────────────────────────────
// A small grand in real inches: about 66" long, 58" wide, 40" tall. The player
// sits at u = 0; the bass is on −v along the straight spine, the treble on +v
// along the curved bent side. Its strings lie flat and run away from the player,
// the bass strings crossing over the tenor, and its hammers strike upward.
//
// Explode and lift distances are in drawn units (see drawScale).

const DRAW_SCALE = 0.42;
/** A rim this size would hatch solid at the usual spacing. */
const HATCH_GAP = 0.6;

const RIM_BOTTOM = 24;
const RIM_TOP = 38;
const WALL = 1.5;
const HALF_WIDTH = 29;
const ARMS_END = 15;

// The rim from the treble arm round the tail to the bass arm, inside and out.
// Same commands, so the two pair up point for point.
const OUTER = sampleOutline(`
  M ${ARMS_END} ${HALF_WIDTH}
  C 28 29, 33 18, 42 12
  C 50 7, 66 8, 66 -6
  C 66 -14, 66 -22, 63 -29
  L ${ARMS_END} -29
`);
const INNER = sampleOutline(`
  M ${ARMS_END} ${HALF_WIDTH - WALL}
  C 27.2 27.5, 32 16.8, 41 10.8
  C 49 6, 64.5 7, 64.5 -6
  C 64.5 -13.6, 64.5 -21.4, 62 -27.5
  L ${ARMS_END} -27.5
`);
/** Where the near side (the bent side) gives way to the far side. */
const NEAR_POINTS = 29;

/** The whole inside of the rim, for what lies within it. */
const INSIDE: V2[] = [...INNER];

/** How far along the piano the inside of the rim reaches, at a place across. */
function farU(v: number): number {
  let best = ARMS_END;
  INSIDE.forEach((a, i) => {
    const b = INSIDE[(i + 1) % INSIDE.length];
    if (a[1] <= v === b[1] <= v) return;
    const u = a[0] + ((v - a[1]) / (b[1] - a[1])) * (b[0] - a[0]);
    best = Math.max(best, u);
  });
  return best;
}

const ARM = (side: 1 | -1): Solid => ({
  outer: roundedRect(
    ARMS_END / 2,
    side * (HALF_WIDTH - WALL),
    ARMS_END / 2,
    WALL,
    0.3,
  ),
  z0: RIM_BOTTOM,
  z1: RIM_TOP - 4,
  hatchGap: HATCH_GAP,
});

const BEAMS: readonly (readonly [V2, V2])[] = [
  [
    [20, -27],
    [58, -2],
  ],
  [
    [20, 27],
    [58, -2],
  ],
  [
    [20, 0],
    [62, -2],
  ],
  [
    [36, -27],
    [58, -2],
  ],
];

const SOUNDBOARD_Z = 29;
const PINBLOCK_U = 14.5;
const PLATE_Z = 35;
const STRING_Z = 36.6;
const LID_ANGLE = 0.61; // 35 degrees
const LID_TILT: Tilt = {
  axisV: -HALF_WIDTH,
  axisZ: RIM_TOP,
  angle: LID_ANGLE,
};

const NOTES = noteOffsets();
/** The lowest notes, wound in copper, cross over the rest. */
const BASS_NOTES = 20;
const STRIKE_U = 17;

const stringLines = (): V3[][] =>
  NOTES.map((v, i): V3[] => {
    const bass = i < BASS_NOTES;
    const lean = bass ? 12 - i * 0.2 : -2 * Math.max(0, (50 - i) / 30);
    const end = v + lean;
    const fromU = PINBLOCK_U + 1;
    return [
      [fromU, v, STRING_Z],
      [Math.max(farU(end) - 2.5, 22), end, STRING_Z],
    ];
  });

const HAMMER_U = STRIKE_U;
const hammerSolids = (): Solid[] =>
  NOTES.map((v) => ({
    outer: roundedRect(HAMMER_U, v, 0.55, 0.19),
    z0: 32,
    z1: 34.6,
    hatch: false,
  }));

/** The highest notes ring out so fast they need no damper. */
const DAMPED_NOTES = 69;
const damperSolids = (): Solid[] =>
  NOTES.slice(0, DAMPED_NOTES).map((v) => ({
    outer: roundedRect(STRIKE_U + 2.2, v, 0.45, 0.2),
    z0: STRING_Z + 0.1,
    z1: STRING_Z + 1.9,
    hatch: false,
  }));

const tuningPinSolids = (): Solid[] =>
  NOTES.flatMap((v, i) => ({
    outer: circle(PINBLOCK_U + (i % 2 ? 0.3 : 1.2), v, 0.13, 6),
    z0: PLATE_Z + 1,
    z1: PLATE_Z + 1.7,
    hatch: false,
  }));

/** The iron plate: the rim's inside with windows for the sound to pass. */
const PLATE_OUTER = INSIDE;
const PLATE_WINDOWS: V2[][] = [
  sampleOutline(`M 24 -2 L 24 21 C 30 19, 34 13, 39 7 L 39 -2 Z`),
  sampleOutline(`M 24 -24 L 24 -6 L 39 -6 L 39 -24 Z`),
  sampleOutline(`M 43 -24 L 43 3 C 50 1, 58 1, 60 -7 L 60 -24 Z`),
];

const TREBLE_BRIDGE = sampleOutline(
  `M 25 25 C 34 17, 44 7, 58 2 C 61 0.5, 62 -2, 61.5 -5`,
);
const BASS_BRIDGE = sampleOutline(`M 48 -24 C 53 -16, 57 -12, 59 -9`);

const PEDAL_V = { soft: -2.4, middle: 0, damper: 2.4 } as const;
const LYRE_U = 13;

const pedal = (id: string, v: number): PartDef => ({
  id,
  solids: [
    {
      outer: strip([LYRE_U - 2.5, v], [LYRE_U - 6.5, v], 0.95),
      z0: 2.6,
      z1: 3.2,
      hatch: false,
    },
  ],
  // Out to the treble side: straight forward, the keybed would cover them.
  explode: [-3, 12, -3],
  hitPad: 0.2,
});

const LEG_SPOTS: readonly V2[] = [
  [6, -25.5],
  [6, 25.5],
  [54, -10],
];

const KEYS = { frontU: 2, z: 28 };

const DESK_V = 15;

const parts: PartDef[] = [
  {
    id: 'casters',
    solids: LEG_SPOTS.map(([u, v]) => ({
      outer: circle(u, v, 1.3, 14),
      z0: 0,
      z1: 2.6,
      hatch: false,
    })),
    explode: [0, 0, -2.2],
    hitPad: 0.2,
  },
  {
    id: 'legs',
    solids: LEG_SPOTS.map(([u, v]) => ({
      outer: circle(u, v, 2.2, 16),
      z0: 2.6,
      z1: RIM_BOTTOM,
      hatchGap: HATCH_GAP,
    })),
    explode: [0, 0, -1],
  },
  {
    id: 'lyre',
    solids: [
      {
        outer: strip([LYRE_U, -3.5], [LYRE_U, -2.6], 1.3),
        z0: 6,
        z1: RIM_BOTTOM,
        hatchGap: HATCH_GAP,
      },
      {
        outer: strip([LYRE_U, 2.6], [LYRE_U, 3.5], 1.3),
        z0: 6,
        z1: RIM_BOTTOM,
        hatchGap: HATCH_GAP,
      },
      {
        outer: roundedRect(LYRE_U, 0, 2.4, 5.5, 0.6),
        z0: 2,
        z1: 6,
        hatchGap: HATCH_GAP,
      },
    ],
    stacked: true,
    explode: [-1, 9, -2],
  },
  pedal('softPedal', PEDAL_V.soft),
  pedal('middlePedal', PEDAL_V.middle),
  pedal('damperPedal', PEDAL_V.damper),
  {
    id: 'rimFar',
    solids: [
      ...BEAMS.map(([a, b]) => ({
        outer: strip(a, b, 2),
        z0: RIM_BOTTOM,
        z1: RIM_BOTTOM + 2.4,
        hatch: false,
      })),
      {
        outer: ringBand(OUTER, INNER, NEAR_POINTS - 1, OUTER.length),
        z0: RIM_BOTTOM,
        z1: RIM_TOP,
        hatchGap: HATCH_GAP,
      },
      ARM(-1),
    ],
    explode: [0, 0, 0],
  },
  {
    id: 'soundboard',
    solids: [
      {
        outer: INSIDE,
        z0: SOUNDBOARD_Z,
        z1: SOUNDBOARD_Z + 0.4,
        hatch: false,
      },
    ],
    marks: [28, 36, 44, 52, 60].map((u): V3[] => [
      [u - 8, -25, SOUNDBOARD_Z + 0.4],
      [Math.min(u + 8, 60), 2, SOUNDBOARD_Z + 0.4],
    ]),
    explode: [7, 0, 2],
  },
  {
    id: 'bridges',
    solids: [
      {
        outer: curvedBar(TREBLE_BRIDGE, 1.1),
        z0: SOUNDBOARD_Z + 0.4,
        z1: SOUNDBOARD_Z + 2.2,
        hatch: false,
      },
      {
        outer: curvedBar(BASS_BRIDGE, 1.1),
        z0: SOUNDBOARD_Z + 0.4,
        z1: SOUNDBOARD_Z + 2.2,
        hatch: false,
      },
    ],
    explode: [11, 0, 3.2],
    hitPad: 0.2,
  },
  {
    id: 'keybed',
    solids: [
      {
        outer: roundedRect(
          ARMS_END / 2,
          0,
          ARMS_END / 2,
          KEYBOARD_HALF + 1,
          0.2,
        ),
        z0: RIM_BOTTOM,
        z1: 26,
        hatchGap: HATCH_GAP,
      },
      {
        // The key slip, the rail along the front of the keys.
        outer: roundedRect(1.2, 0, 0.6, KEYBOARD_HALF + 1),
        z0: 26,
        z1: 27.6,
        hatch: false,
      },
    ],
    explode: [-15, 0, -1.4],
  },
  {
    id: 'hammerRail',
    solids: [
      {
        outer: roundedRect(12.2, 0, 0.8, KEYBOARD_HALF, 0.2),
        z0: 28.5,
        z1: 32,
        hatch: false,
      },
    ],
    explode: [-7, 0, 1.2],
    hitPad: 0.2,
  },
  {
    id: 'hammers',
    solids: hammerSolids(),
    explode: [-7, 0, 2.6],
    hitPad: 0.15,
  },
  {
    id: 'pinblock',
    solids: [
      {
        outer: roundedRect(PINBLOCK_U + 2.2, 0, 3, 26.5, 0.3),
        z0: 33,
        z1: PLATE_Z,
        hatch: false,
      },
    ],
    explode: [15, 0, 4.4],
  },
  {
    id: 'plate',
    solids: [
      {
        outer: PLATE_OUTER,
        holes: PLATE_WINDOWS,
        z0: PLATE_Z,
        z1: PLATE_Z + 0.9,
        hatch: false,
      },
    ],
    explode: [19, 0, 5.6],
  },
  {
    id: 'tuningPins',
    solids: tuningPinSolids(),
    explode: [24, 0, 7],
    hitPad: 0.2,
  },
  {
    id: 'strings',
    solids: [],
    marks: stringLines(),
    explode: [31, 0, 7.4],
    hitPad: 0.1,
    lineWeight: 0.8,
  },
  {
    id: 'dampers',
    solids: damperSolids(),
    explode: [-8, 0, 7.4],
    hitPad: 0.15,
  },
  {
    id: 'whiteKeys',
    solids: whiteKeySolids(KEYS),
    tone: 'light',
    explode: [-15, 0, 0.2],
  },
  {
    id: 'blackKeys',
    solids: blackKeySolids(KEYS),
    explode: [-15, 0, 1.4],
    hitPad: 0.05,
  },
  {
    id: 'fallboard',
    solids: [
      {
        plane: 'front',
        outer: roundedRect(0, 31, KEYBOARD_HALF, 3, 0.4),
        z0: 8.3,
        z1: 9.3,
        hatch: false,
      },
    ],
    explode: [-11, 0, 3.4],
  },
  {
    id: 'rimNear',
    solids: [
      {
        outer: ringBand(OUTER, INNER, 0, NEAR_POINTS),
        z0: RIM_BOTTOM,
        z1: RIM_TOP,
        hatchGap: HATCH_GAP,
      },
      ARM(1),
    ],
    explode: [0, 0, 0],
  },
  {
    id: 'musicDesk',
    solids: [
      {
        plane: 'front',
        outer: roundedRect(0, RIM_TOP + 5.5, DESK_V, 5.5, 0.6),
        z0: 13,
        z1: 13.7,
        hatch: false,
      },
    ],
    marks: [-1, 1].map((k): V3[] => [
      [12.9, k * (DESK_V - 1.2), RIM_TOP + 1],
      [12.9, k * (DESK_V - 1.2), RIM_TOP + 10],
    ]),
    explode: [-8, 0, 7],
  },
  {
    id: 'propStick',
    solids: [
      {
        outer: circle(32, 13, 0.55, 10),
        z0: RIM_TOP,
        z1: RIM_TOP + (13 + HALF_WIDTH) * Math.tan(LID_ANGLE),
        hatch: false,
      },
    ],
    explode: [-1, -13, 5],
    hitPad: 0.25,
  },
  {
    id: 'lid',
    solids: [
      {
        outer: OUTER,
        z0: RIM_TOP,
        z1: RIM_TOP + 0.9,
        tilt: LID_TILT,
        hatch: false,
      },
    ],
    explode: [0, -14, 7],
  },
];

const ACTION_PARTS = ['hammerRail', 'hammers', 'dampers'];
const LID_AWAY: Record<string, V3> = {
  lid: [0, -14, 7],
  propStick: [-1, -13, 5],
  musicDesk: [-8, 0, 7],
};
const PEDALS = ['softPedal', 'middlePedal', 'damperPedal'];
const allBut = (keep: readonly string[], offset: V3) =>
  Object.fromEntries(
    parts
      .filter((p) => !keep.includes(p.id))
      .map((p): [string, V3] => [p.id, offset]),
  );

/** Raises the given parts, so what's beneath them can be seen. */
const raised = (ids: readonly string[], z: number) =>
  Object.fromEntries(ids.map((id): [string, V3] => [id, [0, 0, z]]));

const terms: TermDef[] = [
  // Case
  {
    id: 'lid',
    name: 'Lid',
    family: 'case',
    parts: ['lid'],
    lift: [0, -6, 4],
    reveal: { propStick: [0, -6, 4] },
  },
  {
    id: 'propStick',
    name: 'Prop Stick',
    family: 'case',
    parts: ['propStick'],
    lift: [2, -6, 3],
  },
  {
    id: 'rim',
    name: 'Rim',
    family: 'case',
    parts: ['rimFar', 'rimNear'],
    lift: [0, 0, 0],
    reveal: allBut(['rimFar', 'rimNear'], [0, 0, 8]),
  },
  {
    id: 'musicDesk',
    name: 'Music Desk',
    family: 'case',
    parts: ['musicDesk'],
    lift: [-3, 0, 3],
  },
  {
    id: 'fallboard',
    name: 'Fallboard',
    family: 'case',
    parts: ['fallboard'],
    lift: [-4, 0, 3],
  },
  {
    id: 'legs',
    name: 'Legs',
    family: 'case',
    parts: ['legs'],
    lift: [0, 0, -2],
    reveal: { casters: [0, 0, -2] },
  },
  {
    id: 'casters',
    name: 'Casters',
    family: 'case',
    parts: ['casters'],
    lift: [0, 0, -2],
  },
  // Keyboard
  {
    id: 'keys',
    name: 'Keys',
    family: 'keyboard',
    parts: ['whiteKeys', 'blackKeys'],
    lift: [-5, 0, 2],
  },
  {
    id: 'whiteKeys',
    name: 'White Keys',
    family: 'keyboard',
    parts: ['whiteKeys'],
    lift: [-5, 0, 2],
    reveal: { blackKeys: [-5, 0, 5] },
  },
  {
    id: 'blackKeys',
    name: 'Black Keys',
    family: 'keyboard',
    parts: ['blackKeys'],
    lift: [-5, 0, 3],
  },
  {
    id: 'keybed',
    name: 'Keybed',
    family: 'keyboard',
    parts: ['keybed'],
    lift: [-9, 0, 0],
    reveal: {
      whiteKeys: [-3, 0, 4],
      blackKeys: [-3, 0, 4],
      fallboard: [-3, 0, 5],
    },
  },
  // Action
  {
    id: 'action',
    name: 'Action',
    family: 'action',
    parts: ACTION_PARTS,
    lift: [-6, 0, 3],
    liftOf: { dampers: [0, 0, 6] },
    reveal: {
      ...LID_AWAY,
      plate: [0, 0, 5],
      tuningPins: [0, 0, 5],
      strings: [0, 0, 5],
    },
    anchor: [HAMMER_U, 0, 34.6],
  },
  {
    id: 'hammers',
    name: 'Hammers',
    family: 'action',
    parts: ['hammers'],
    lift: [-7, 0, 2],
    reveal: { ...LID_AWAY, hammerRail: [-7, 0, 2] },
  },
  {
    id: 'dampers',
    name: 'Dampers',
    family: 'action',
    parts: ['dampers'],
    lift: [0, 0, 5],
    reveal: LID_AWAY,
  },
  // Strings & soundboard
  {
    id: 'strings',
    name: 'Strings',
    family: 'strings',
    parts: ['strings'],
    lift: [0, 0, 4],
    reveal: { ...LID_AWAY, dampers: [0, 0, 7] },
  },
  {
    id: 'plate',
    name: 'Cast-Iron Plate',
    family: 'strings',
    parts: ['plate'],
    lift: [0, 0, 4.5],
    reveal: {
      ...LID_AWAY,
      ...raised(['tuningPins', 'strings', 'dampers'], 8),
    },
  },
  {
    id: 'tuningPins',
    name: 'Tuning Pins',
    family: 'strings',
    parts: ['tuningPins'],
    lift: [0, 0, 3],
    reveal: { ...LID_AWAY, ...raised(['strings', 'dampers'], 6) },
  },
  {
    id: 'pinblock',
    name: 'Pinblock',
    family: 'strings',
    parts: ['pinblock'],
    lift: [0, 0, 2.5],
    reveal: {
      ...LID_AWAY,
      ...raised(['plate', 'tuningPins', 'strings', 'dampers'], 6),
    },
  },
  {
    id: 'bridges',
    name: 'Bridges',
    family: 'strings',
    parts: ['bridges'],
    lift: [0, 0, 2],
    reveal: {
      ...LID_AWAY,
      ...raised(['plate', 'tuningPins', 'strings', 'dampers', 'pinblock'], 7),
    },
  },
  {
    id: 'soundboard',
    name: 'Soundboard',
    family: 'strings',
    parts: ['soundboard'],
    lift: [0, 0, 1],
    reveal: {
      ...LID_AWAY,
      bridges: [0, 0, 1],
      ...raised(['plate', 'tuningPins', 'strings', 'dampers', 'pinblock'], 8),
      hammers: [-7, 0, 2],
      hammerRail: [-7, 0, 2],
    },
  },
  // Pedals
  {
    id: 'pedals',
    name: 'Pedals',
    family: 'pedals',
    parts: PEDALS,
    lift: [-4, 0, -1.4],
  },
  {
    id: 'softPedal',
    name: 'Soft Pedal',
    family: 'pedals',
    parts: ['softPedal'],
    lift: [-4, 0, -1.4],
  },
  {
    id: 'middlePedal',
    name: 'Middle Pedal',
    family: 'pedals',
    parts: ['middlePedal'],
    lift: [-4, 0, -1.4],
  },
  {
    id: 'damperPedal',
    name: 'Damper Pedal',
    family: 'pedals',
    parts: ['damperPedal'],
    lift: [-4, 0, -1.4],
  },
  {
    id: 'lyre',
    name: 'Lyre',
    family: 'pedals',
    parts: ['lyre'],
    lift: [-5, 0, -1],
    reveal: Object.fromEntries(
      PEDALS.map((id): [string, V3] => [id, [-5, 0, -1]]),
    ),
  },
];

export const GRAND_PIANO_MODEL: InstrumentModel = {
  kind: 'grandPiano',
  label: 'Grand',
  noun: 'piano',
  accentKey: 'Db',
  drawScale: DRAW_SCALE,
  fixedHand: true,
  maxZoom: 3,
  parts,
  terms,
  buildOrder: [
    { term: 'legs', parts: ['legs'] },
    { term: 'casters', parts: ['casters'] },
    { term: 'rim', parts: ['rimFar', 'rimNear'] },
    { term: 'lyre', parts: ['lyre'] },
    { term: 'softPedal', parts: ['softPedal'] },
    { term: 'middlePedal', parts: ['middlePedal'] },
    { term: 'damperPedal', parts: ['damperPedal'] },
    { term: 'soundboard', parts: ['soundboard'] },
    { term: 'bridges', parts: ['bridges'] },
    { term: 'pinblock', parts: ['pinblock'] },
    { term: 'plate', parts: ['plate'] },
    { term: 'tuningPins', parts: ['tuningPins'] },
    { term: 'strings', parts: ['strings'] },
    { term: 'keybed', parts: ['keybed'] },
    { term: 'whiteKeys', parts: ['whiteKeys'] },
    { term: 'blackKeys', parts: ['blackKeys'] },
    { term: 'hammers', name: 'Hammer Rail', parts: ['hammerRail'] },
    { term: 'hammers', parts: ['hammers'] },
    { term: 'dampers', parts: ['dampers'] },
    { term: 'fallboard', parts: ['fallboard'] },
    { term: 'musicDesk', parts: ['musicDesk'] },
    { term: 'lid', parts: ['lid'] },
    { term: 'propStick', parts: ['propStick'] },
  ],
};
