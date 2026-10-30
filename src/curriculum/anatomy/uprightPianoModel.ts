import type { InstrumentModel, PartDef, TermDef } from './anatomyTypes';
import {
  circle,
  curvedBar,
  roundedRect,
  sampleOutline,
  strip,
  type Solid,
  type V2,
  type V3,
} from './iso';
import {
  blackKeySolids,
  KEYBOARD_HALF,
  noteOffsets,
  whiteKeySolids,
} from './pianoKeys';

// ── The upright piano ──────────────────────────────────────────────────────
// A studio upright in real inches: about 58" wide, 25" deep, 48" tall. The player
// sits at u = 0; the bass is on −v, the treble on +v. Everything a grand lays
// flat stands up here, so its strings and soundboard are vertical, in layers
// from the player to the back posts. Its hammers strike forward, away from the
// player, and it comes apart along that same line.
//
// Explode and lift distances are in drawn units (see drawScale).

const DRAW_SCALE = 0.42;
const HATCH_GAP = 0.6;

const HEIGHT = 48;
const BACK_U = 25.5;
const HALF_WIDTH = 29;
const CHEEK = 1;

const STRING_U = 19.7;
const STRING_TOP = 44;

const NOTES = noteOffsets();
/** The lowest notes, wound in copper, cross over the rest. */
const BASS_NOTES = 20;

/** From its tuning pin, down to where it ends on the plate. The bass strings
 *  run on the diagonal, and the treble's are short. */
const stringLines = (): V3[][] =>
  NOTES.map((v, i): V3[] => {
    const bass = i < BASS_NOTES;
    const endV = bass ? v + 18 - i * 0.25 : v;
    const endZ = bass
      ? 6 + i * 0.1
      : 7 + ((i - BASS_NOTES) / (NOTES.length - BASS_NOTES)) ** 1.5 * 30;
    return [
      [STRING_U, v, STRING_TOP],
      [STRING_U, endV, endZ],
    ];
  });

const hammerSolids = (): Solid[] =>
  NOTES.map((v) => ({
    outer: roundedRect(18, v, 1, 0.19),
    z0: 33,
    z1: 35.4,
    hatch: false,
  }));

/** The highest notes ring out so fast they need no damper. */
const DAMPED_NOTES = 69;
const damperSolids = (): Solid[] =>
  NOTES.slice(0, DAMPED_NOTES).map((v) => ({
    outer: roundedRect(18.6, v, 0.7, 0.2),
    z0: 36,
    z1: 38,
    hatch: false,
  }));

const tuningPinSolids = (): Solid[] =>
  NOTES.map((v, i) => ({
    plane: 'front' as const,
    outer: circle(v, STRING_TOP + (i % 2 ? 0.3 : 1.1), 0.13, 6),
    z0: 19.4,
    z1: 20,
    hatch: false,
  }));

// Upright outlines are (v, z).
const PLATE_WINDOWS: V2[][] = [
  roundedRect(-13, 25, 11, 14, 1),
  roundedRect(11, 22, 11, 11, 1),
];

const TREBLE_BRIDGE = sampleOutline(`M 26 34 C 16 28, 2 20, -10 8`);
const BASS_BRIDGE = sampleOutline(`M 3 8 C 8 7, 15 7, 22 8`);

const PEDAL_V = { soft: -2.4, middle: 0, damper: 2.4 } as const;

const pedal = (id: string, v: number): PartDef => ({
  id,
  solids: [
    {
      outer: strip([8, v], [3.6, v], 0.95),
      z0: 2.6,
      z1: 3.2,
      hatch: false,
    },
  ],
  explode: [-20, 0, -1],
  hitPad: 0.2,
});

const KEYS = { frontU: 1.8, z: 27.6 };

const cheek = (side: 1 | -1): Solid => ({
  outer: roundedRect(16.75, side * (HALF_WIDTH - CHEEK / 2), 8.75, CHEEK / 2),
  z0: 0,
  z1: HEIGHT,
  hatchGap: HATCH_GAP,
});
const arm = (side: 1 | -1): Solid => ({
  outer: roundedRect(4.5, side * (HALF_WIDTH - CHEEK / 2), 3.5, CHEEK / 2, 0.2),
  z0: 24,
  z1: 31,
  hatch: false,
});

const parts: PartDef[] = [
  {
    id: 'casters',
    solids: (
      [
        [2, -28.5],
        [2, 28.5],
        [23, -27.5],
        [23, 27.5],
      ] as const
    ).map(([u, v]) => ({
      outer: circle(u, v, 1, 12),
      z0: 0,
      z1: 2,
      hatch: false,
    })),
    explode: [0, 0, -2],
    hitPad: 0.2,
  },
  {
    id: 'backPosts',
    solids: [-24, -12, 0, 12, 24].map((v) => ({
      outer: strip([BACK_U - 1.5, v], [BACK_U, v], 3),
      z0: 2,
      z1: HEIGHT - 1,
      hatchGap: HATCH_GAP,
    })),
    explode: [15, 0, 0],
  },
  {
    id: 'caseFar',
    solids: [
      cheek(-1),
      {
        outer: roundedRect(16.75, 0, 8.75, HALF_WIDTH - CHEEK),
        z0: 2,
        z1: 3,
        hatch: false,
      },
      arm(-1),
    ],
    explode: [0, 0, 0],
  },
  {
    id: 'soundboard',
    solids: [
      {
        plane: 'front',
        outer: roundedRect(0, 24.5, 27, 20.5, 0.5),
        z0: 22.4,
        z1: 22.8,
        hatch: false,
      },
    ],
    marks: [-20, -10, 0, 10, 20].map((v): V3[] => [
      [22.35, v - 6, 6],
      [22.35, v + 6, 43],
    ]),
    explode: [12, 0, 0],
  },
  {
    id: 'bridges',
    solids: [
      {
        plane: 'front',
        outer: curvedBar(TREBLE_BRIDGE, 1.1),
        z0: 21.5,
        z1: 22.4,
        hatch: false,
      },
      {
        plane: 'front',
        outer: curvedBar(BASS_BRIDGE, 1.1),
        z0: 21.5,
        z1: 22.4,
        hatch: false,
      },
    ],
    explode: [10, 0, 0],
    hitPad: 0.2,
  },
  {
    id: 'pinblock',
    solids: [
      {
        plane: 'front',
        outer: roundedRect(0, 42.5, 27, 4, 0.4),
        z0: 21,
        z1: 22,
        hatch: false,
      },
    ],
    explode: [8.5, 0, 0],
  },
  {
    id: 'plate',
    solids: [
      {
        plane: 'front',
        outer: roundedRect(0, 25, 27, 21, 1),
        holes: PLATE_WINDOWS,
        z0: 20.2,
        z1: 21,
        hatch: false,
      },
    ],
    explode: [6.5, 0, 0],
  },
  {
    id: 'tuningPins',
    solids: tuningPinSolids(),
    explode: [4.5, 0, 0],
    hitPad: 0.2,
  },
  {
    id: 'strings',
    solids: [],
    marks: stringLines(),
    explode: [2.8, 0, 0],
    hitPad: 0.1,
    lineWeight: 0.8,
  },
  {
    id: 'dampers',
    solids: damperSolids(),
    explode: [-3, 0, 1],
    hitPad: 0.15,
  },
  {
    id: 'hammers',
    solids: hammerSolids(),
    explode: [-5, 0, 0],
    hitPad: 0.15,
  },
  {
    id: 'hammerRail',
    solids: [
      {
        plane: 'front',
        outer: roundedRect(0, 31, KEYBOARD_HALF, 2.4, 0.2),
        z0: 15,
        z1: 15.9,
        hatch: false,
      },
    ],
    explode: [-7, 0, 0],
    hitPad: 0.2,
  },
  {
    id: 'upperPanel',
    solids: [
      {
        plane: 'front',
        outer: roundedRect(0, 39.5, HALF_WIDTH - CHEEK, 8.3, 0.3),
        z0: 10,
        z1: 10.7,
        hatch: false,
      },
    ],
    marks: [roundedRect(0, 39.5, HALF_WIDTH - 3, 6.5, 0.3)].map((ring): V3[] =>
      [...ring, ring[0]].map(([v, z]): V3 => [9.95, v, z]),
    ),
    explode: [-20, 0, 4],
  },
  {
    id: 'musicDesk',
    solids: [
      {
        plane: 'front',
        outer: roundedRect(0, 36.5, 13, 3.4, 0.4),
        z0: 8.8,
        z1: 9.4,
        hatch: false,
      },
    ],
    explode: [-23, 0, 6],
  },
  {
    id: 'lowerPanel',
    solids: [
      {
        plane: 'front',
        outer: roundedRect(0, 14, HALF_WIDTH - CHEEK, 10, 0.3),
        z0: 8,
        z1: 8.7,
        hatch: false,
      },
    ],
    marks: [roundedRect(0, 14, HALF_WIDTH - 3, 8.2, 0.3)].map((ring): V3[] =>
      [...ring, ring[0]].map(([v, z]): V3 => [7.95, v, z]),
    ),
    explode: [-17, 0, -1],
  },
  {
    id: 'legs',
    solids: [-1, 1].map((side) => ({
      outer: roundedRect(2, side * (HALF_WIDTH - 0.5), 1, 0.5),
      z0: 2,
      z1: 24,
      hatch: false,
    })),
    explode: [-3, 0, -1],
    hitPad: 0.2,
  },
  pedal('softPedal', PEDAL_V.soft),
  pedal('middlePedal', PEDAL_V.middle),
  pedal('damperPedal', PEDAL_V.damper),
  {
    id: 'keybed',
    solids: [
      {
        outer: roundedRect(8, 0, 7.5, KEYBOARD_HALF + 1, 0.2),
        z0: 24,
        z1: 26,
        hatchGap: HATCH_GAP,
      },
      {
        // The key slip, the rail along the front of the keys.
        outer: roundedRect(1.1, 0, 0.6, KEYBOARD_HALF + 1),
        z0: 26,
        z1: 27.2,
        hatch: false,
      },
    ],
    explode: [-11, 0, -1],
  },
  {
    id: 'whiteKeys',
    solids: whiteKeySolids(KEYS),
    tone: 'light',
    explode: [-11, 0, 0.6],
  },
  {
    id: 'blackKeys',
    solids: blackKeySolids(KEYS),
    explode: [-11, 0, 1.7],
    hitPad: 0.05,
  },
  {
    id: 'fallboard',
    solids: [
      {
        plane: 'front',
        outer: roundedRect(0, 30.5, KEYBOARD_HALF, 2.8, 0.3),
        z0: 8,
        z1: 8.8,
        hatch: false,
      },
    ],
    explode: [-14, 0, 2.2],
  },
  {
    id: 'caseNear',
    solids: [cheek(1), arm(1)],
    explode: [0, 0, 0],
  },
  {
    id: 'lid',
    solids: [
      {
        outer: roundedRect(18, 0, 8, HALF_WIDTH + 0.5, 0.2),
        z0: HEIGHT,
        z1: HEIGHT + 0.9,
        hatch: false,
      },
    ],
    explode: [0, 0, 6],
  },
];

const ACTION_PARTS = ['hammerRail', 'hammers', 'dampers'];
const PEDALS = ['softPedal', 'middlePedal', 'damperPedal'];
const OUT_FRONT: Record<string, V3> = {
  upperPanel: [-16, 0, 4],
  musicDesk: [-18, 0, 5],
  fallboard: [-12, 0, 2],
  whiteKeys: [-7, 0, 0],
  blackKeys: [-7, 0, 0],
  keybed: [-7, 0, 0],
  lowerPanel: [-15, 0, 0],
  lid: [0, 0, 6],
  legs: [-3, 0, 0],
  softPedal: [-16, 0, 0],
  middlePedal: [-16, 0, 0],
  damperPedal: [-16, 0, 0],
};
const ACTION_OUT: Record<string, V3> = {
  hammerRail: [-4, 0, 0],
  hammers: [-4, 0, 0],
  dampers: [-4, 0, 0],
};
const allBut = (keep: readonly string[], offset: V3) =>
  Object.fromEntries(
    parts
      .filter((p) => !keep.includes(p.id))
      .map((p): [string, V3] => [p.id, offset]),
  );

const terms: TermDef[] = [
  // Case
  {
    id: 'lid',
    name: 'Lid',
    family: 'case',
    parts: ['lid'],
    lift: [0, 0, 4],
  },
  {
    id: 'case',
    name: 'Case',
    family: 'case',
    parts: ['caseFar', 'caseNear'],
    lift: [0, 0, 0],
    reveal: {
      ...allBut(['caseFar', 'caseNear', 'lid'], [-8, 0, 0]),
      lid: [0, 0, 6],
    },
  },
  {
    id: 'upperPanel',
    name: 'Upper Panel',
    family: 'case',
    parts: ['upperPanel'],
    lift: [-6, 0, 4],
    reveal: { musicDesk: [-6, 0, 4] },
  },
  {
    id: 'lowerPanel',
    name: 'Lower Panel',
    family: 'case',
    parts: ['lowerPanel'],
    lift: [-6, 0, -1],
  },
  {
    id: 'backPosts',
    name: 'Back Posts',
    family: 'case',
    parts: ['backPosts'],
    lift: [6, 0, 0],
  },
  {
    id: 'musicDesk',
    name: 'Music Desk',
    family: 'case',
    parts: ['musicDesk'],
    lift: [-5, 0, 2],
  },
  {
    id: 'fallboard',
    name: 'Fallboard',
    family: 'case',
    parts: ['fallboard'],
    lift: [-5, 0, 2],
  },
  {
    id: 'legs',
    name: 'Legs',
    family: 'case',
    parts: ['legs'],
    lift: [-4, 0, 0],
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
    lift: [-5, 0, 0],
    reveal: OUT_FRONT,
    seeThrough: ['caseNear'],
    anchor: [18, 0, 35],
  },
  {
    id: 'hammers',
    name: 'Hammers',
    family: 'action',
    parts: ['hammers'],
    lift: [-5, 0, 0],
    reveal: {
      ...OUT_FRONT,
      hammerRail: [-5, 0, 0],
      dampers: [-2, 0, 1],
    },
    seeThrough: ['caseNear'],
  },
  {
    id: 'dampers',
    name: 'Dampers',
    family: 'action',
    parts: ['dampers'],
    lift: [-5, 0, 3],
    reveal: OUT_FRONT,
    seeThrough: ['caseNear'],
  },
  // Strings & soundboard
  {
    id: 'strings',
    name: 'Strings',
    family: 'strings',
    parts: ['strings'],
    lift: [0, 0, 0],
    reveal: { ...OUT_FRONT, ...ACTION_OUT },
    seeThrough: ['caseNear'],
    anchor: [STRING_U, 0, 26],
  },
  {
    id: 'plate',
    name: 'Cast-Iron Plate',
    family: 'strings',
    parts: ['plate'],
    lift: [0, 0, 0],
    reveal: {
      ...OUT_FRONT,
      ...ACTION_OUT,
      strings: [-6, 0, 0],
      tuningPins: [-6, 0, 0],
    },
    seeThrough: ['caseNear', 'strings', 'tuningPins'],
    anchor: [20.2, 15, 42],
  },
  {
    id: 'tuningPins',
    name: 'Tuning Pins',
    family: 'strings',
    parts: ['tuningPins'],
    lift: [-3, 0, 0],
    reveal: { ...OUT_FRONT, ...ACTION_OUT },
    seeThrough: ['caseNear'],
  },
  {
    id: 'pinblock',
    name: 'Pinblock',
    family: 'strings',
    parts: ['pinblock'],
    lift: [-3, 0, 5],
    reveal: { ...OUT_FRONT, ...ACTION_OUT },
    seeThrough: ['caseNear', 'plate', 'strings', 'tuningPins'],
  },
  {
    id: 'bridges',
    name: 'Bridges',
    family: 'strings',
    parts: ['bridges'],
    lift: [0, 0, 0],
    reveal: { ...OUT_FRONT, ...ACTION_OUT },
    seeThrough: ['caseNear', 'plate', 'strings', 'tuningPins', 'pinblock'],
  },
  {
    id: 'soundboard',
    name: 'Soundboard',
    family: 'strings',
    parts: ['soundboard'],
    lift: [0, 0, 0],
    reveal: { ...OUT_FRONT, ...ACTION_OUT },
    seeThrough: [
      'caseNear',
      'plate',
      'strings',
      'tuningPins',
      'pinblock',
      'bridges',
    ],
  },
  // Pedals
  {
    id: 'pedals',
    name: 'Pedals',
    family: 'pedals',
    parts: PEDALS,
    lift: [-5, 0, -1],
  },
  {
    id: 'softPedal',
    name: 'Soft Pedal',
    family: 'pedals',
    parts: ['softPedal'],
    lift: [-5, 0, -1],
  },
  {
    id: 'middlePedal',
    name: 'Middle Pedal',
    family: 'pedals',
    parts: ['middlePedal'],
    lift: [-5, 0, -1],
  },
  {
    id: 'damperPedal',
    name: 'Damper Pedal',
    family: 'pedals',
    parts: ['damperPedal'],
    lift: [-5, 0, -1],
  },
];

export const UPRIGHT_PIANO_MODEL: InstrumentModel = {
  kind: 'uprightPiano',
  label: 'Upright',
  noun: 'piano',
  accentKey: 'Bb',
  drawScale: DRAW_SCALE,
  fixedHand: true,
  maxZoom: 3,
  parts,
  terms,
  buildOrder: [
    { term: 'case', parts: ['caseFar', 'caseNear'] },
    { term: 'casters', parts: ['casters'] },
    { term: 'legs', parts: ['legs'] },
    { term: 'backPosts', parts: ['backPosts'] },
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
    { term: 'softPedal', parts: ['softPedal'] },
    { term: 'middlePedal', parts: ['middlePedal'] },
    { term: 'damperPedal', parts: ['damperPedal'] },
    { term: 'lowerPanel', parts: ['lowerPanel'] },
    { term: 'fallboard', parts: ['fallboard'] },
    { term: 'upperPanel', parts: ['upperPanel'] },
    { term: 'musicDesk', parts: ['musicDesk'] },
    { term: 'lid', parts: ['lid'] },
  ],
};
