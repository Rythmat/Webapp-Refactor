import type { InstrumentModel, PartDef, TermDef } from './anatomyTypes';
import {
  circle,
  hatchInside,
  ringMarks,
  roundedRect,
  type Solid,
  type V3,
} from './iso';
import { blackKeySolids, keyboardHalf, whiteKeySolids } from './pianoKeys';

// ── The electronic keyboard ────────────────────────────────────────────────
// A typical 61-key home keyboard, in real inches: about 38" wide, 14.5" deep,
// 3.6" tall. The player sits at u = 0. Where a piano has strings it has a circuit
// board and speakers: rubber sensors under the keys report each note, the board
// makes the sound, and the speakers play it.
//
// Explode and lift distances are in drawn units (see drawScale).

const DRAW_SCALE = 1.15;

const LOW = 36; // C2
const HIGH = 96; // C7
const KEYS_HALF = keyboardHalf(LOW, HIGH);
const KEYS = { frontU: 1, z: 3.2, low: LOW, high: HIGH };

const HALF_WIDTH = 19;
const DEPTH = 14.5;
const SHELL_SPLIT = 2.6;
const TOP = 3.6;

const SPEAKER_U = 10.9;
const SPEAKER_V = 14.8;
const SPEAKER_R = 2.1;

const CASE_OUTLINE = roundedRect(DEPTH / 2, 0, DEPTH / 2, HALF_WIDTH, 0.7);

const KEY_WINDOW = roundedRect(4.05, 0, 3.25, KEYS_HALF + 0.25, 0.1);
const WHEEL_U = 4.2;
const WHEEL_V = KEYS_HALF + 1.15;
const WHEEL_SLOT = roundedRect(WHEEL_U, -WHEEL_V, 1.5, 0.45, 0.1);

const grilleHoles = [-1, 1].map((side) =>
  circle(SPEAKER_U, side * SPEAKER_V, SPEAKER_R + 0.1, 28),
);

const button = (u: number, v: number, halfV = 0.42): Solid => ({
  outer: roundedRect(u, v, 0.32, halfV, 0.08),
  z0: TOP,
  z1: TOP + 0.14,
  hatch: false,
});

const BUTTON_ROWS = [9.5, 11, 12.5];
const BUTTON_COLUMNS = [-9, -7.4, -5.8, -4.2, 4.2, 5.8, 7.4, 9];

const chip = (u: number, v: number, halfU: number, halfV: number): Solid => ({
  outer: roundedRect(u, v, halfU, halfV, 0.04),
  z0: 1.35,
  z1: 1.55,
  hatch: false,
});

const parts: PartDef[] = [
  {
    id: 'sustainPedal',
    solids: [
      {
        outer: roundedRect(1, 8, 2.1, 1.3, 0.5),
        z0: -9,
        z1: -8.2,
        hatchGap: 0.2,
      },
    ],
    marks: [
      // Its cable, up to the jack at the back.
      [
        [3.1, 8, -8.6],
        [9, 8, -8.6],
        [14.5, 8, -4],
        [14.5, 8, 0],
      ],
    ],
    explode: [-2, 3, -1],
    hitPad: 0.2,
  },
  {
    id: 'bottomShell',
    solids: [
      { outer: CASE_OUTLINE, z0: 0, z1: 0.2, hatch: false },
      {
        outer: CASE_OUTLINE,
        holes: [roundedRect(DEPTH / 2, 0, DEPTH / 2 - 0.3, HALF_WIDTH - 0.3)],
        z0: 0.2,
        z1: SHELL_SPLIT,
      },
    ],
    explode: [0, 0, 0],
  },
  {
    id: 'mainBoard',
    solids: [
      {
        outer: roundedRect(10.6, 0, 3, 10.5, 0.1),
        z0: 1.2,
        z1: 1.35,
        hatch: false,
      },
      chip(10.2, -3.2, 1, 1.4),
      chip(10.2, 2.2, 0.8, 0.8),
      chip(12.2, -7.5, 0.5, 1.2),
      chip(12.2, 7, 0.5, 1.2),
      chip(9, 6.5, 0.45, 0.8),
      chip(9, -8, 0.45, 0.8),
    ],
    explode: [3, 0, 3.2],
  },
  {
    id: 'jacks',
    solids: [
      {
        plane: 'front',
        outer: roundedRect(5, 1.3, 5.2, 0.7, 0.1),
        z0: 14,
        z1: 14.3,
        hatch: false,
      },
    ],
    marks: [1, 2.8, 4.6, 6.4, 8.2].map((v): V3[] => {
      const ring = circle(v, 1.3, 0.3, 12);
      return [...ring, ring[0]].map(([a, b]): V3 => [13.95, a, b]);
    }),
    explode: [8, 0, 3],
    hitPad: 0.2,
  },
  {
    id: 'speakers',
    solids: [-1, 1].map((side) => ({
      outer: circle(SPEAKER_U, side * SPEAKER_V, SPEAKER_R, 28),
      z0: 0.9,
      z1: 2.5,
      hatchGap: 0.2,
    })),
    marks: [-1, 1].flatMap((side) =>
      [SPEAKER_R * 0.68, SPEAKER_R * 0.32].map((r) =>
        ringMarks(SPEAKER_U, side * SPEAKER_V, r, 2.5, 22),
      ),
    ),
    explode: [3, 0, 6],
  },
  {
    id: 'keybed',
    solids: [
      {
        outer: roundedRect(4.5, 0, 3.8, KEYS_HALF + 0.3, 0.1),
        z0: 1,
        z1: 2,
        hatch: false,
      },
    ],
    explode: [-6, 0, 3],
  },
  {
    id: 'keySensors',
    solids: [
      {
        outer: roundedRect(5.4, 0, 0.45, KEYS_HALF, 0.1),
        z0: 2,
        z1: 2.12,
        hatch: false,
      },
    ],
    // A rubber dome for each key.
    marks: Array.from({ length: 61 }, (_, i) =>
      ringMarks(
        5.4,
        -KEYS_HALF + (i + 0.5) * ((KEYS_HALF * 2) / 61),
        0.12,
        2.12,
        6,
      ),
    ),
    explode: [-6, 0, 5],
    hitPad: 0.2,
  },
  {
    id: 'whiteKeys',
    solids: whiteKeySolids(KEYS),
    tone: 'light',
    explode: [-6, 0, 7],
  },
  {
    id: 'blackKeys',
    solids: blackKeySolids(KEYS),
    explode: [-6, 0, 8.6],
    hitPad: 0.05,
  },
  {
    id: 'topShell',
    solids: [
      {
        outer: CASE_OUTLINE,
        holes: [KEY_WINDOW, WHEEL_SLOT, ...grilleHoles],
        z0: SHELL_SPLIT,
        z1: TOP,
      },
    ],
    explode: [2, 0, 10],
  },
  {
    id: 'grilles',
    solids: [],
    marks: grilleHoles.flatMap((ring) => [
      [...ring, ring[0]].map(([u, v]): V3 => [u, v, TOP]),
      ...hatchInside(ring, [], TOP, 0.42, 0.7),
    ]),
    explode: [2, 0, 12.4],
    hitPad: 0.1,
  },
  {
    id: 'pitchWheel',
    solids: [
      {
        plane: 'side',
        outer: circle(WHEEL_U, 2.75, 1.25, 22),
        z0: -WHEEL_V - 0.3,
        z1: -WHEEL_V + 0.3,
        hatch: false,
      },
    ],
    explode: [-6, -3, 6],
    hitPad: 0.15,
  },
  {
    id: 'display',
    solids: [
      {
        outer: roundedRect(11, 0, 1.75, 3.2, 0.12),
        z0: TOP,
        z1: TOP + 0.06,
        hatch: false,
      },
    ],
    marks: [
      [
        [10.1, -2.6, TOP + 0.06],
        [10.1, 1, TOP + 0.06],
      ],
      [
        [11, -2.6, TOP + 0.06],
        [11, 2.6, TOP + 0.06],
      ],
      [
        [11.9, -2.6, TOP + 0.06],
        [11.9, 0.2, TOP + 0.06],
      ],
    ],
    explode: [4, 0, 13.6],
    hitPad: 0.1,
  },
  {
    id: 'buttons',
    solids: BUTTON_ROWS.flatMap((u) => BUTTON_COLUMNS.map((v) => button(u, v))),
    explode: [4, 0, 15.2],
    hitPad: 0.1,
  },
  {
    id: 'dial',
    solids: [
      {
        outer: circle(11, 11.05, 0.72, 22),
        z0: TOP,
        z1: TOP + 0.34,
        hatch: false,
      },
    ],
    marks: [ringMarks(11, 11.05, 0.42, TOP + 0.34, 16)],
    explode: [4, 3, 13.6],
    hitPad: 0.1,
  },
  {
    id: 'volumeKnob',
    solids: [
      {
        outer: circle(10.4, -11.05, 0.56, 20),
        z0: TOP,
        z1: TOP + 0.4,
        hatch: false,
      },
    ],
    marks: [
      [
        [10.1, -11.05, TOP + 0.4],
        [10.4, -11.05, TOP + 0.4],
      ],
    ],
    explode: [4, -3, 13.6],
    hitPad: 0.1,
  },
  {
    id: 'powerButton',
    solids: [button(12.4, -11.05, 0.5)],
    explode: [6, -3, 13.6],
    hitPad: 0.2,
  },
  {
    id: 'musicRest',
    solids: [
      {
        plane: 'front',
        outer: roundedRect(0, 7, 10, 3.4, 0.4),
        z0: 13.4,
        z1: 13.65,
        hatch: false,
      },
    ],
    explode: [6, 0, 16],
  },
];

const PANEL = ['display', 'buttons', 'dial', 'volumeKnob', 'powerButton'];
const raised = (ids: readonly string[], offset: V3) =>
  Object.fromEntries(ids.map((id): [string, V3] => [id, offset]));
/** The top of the case, with what's on it. */
const LID_OFF: Record<string, V3> = {
  ...raised(['topShell', 'grilles', 'pitchWheel', ...PANEL], [2, 0, 8]),
  musicRest: [4, 0, 12],
};

const terms: TermDef[] = [
  // Case
  {
    id: 'case',
    name: 'Case',
    family: 'case',
    parts: ['topShell', 'bottomShell'],
    lift: [0, 0, 0],
    liftOf: { topShell: [2, 0, 7] },
    reveal: {
      ...raised(['grilles', 'pitchWheel', ...PANEL], [2, 0, 7]),
      musicRest: [4, 0, 11],
    },
  },
  {
    id: 'grilles',
    name: 'Speaker Grilles',
    family: 'case',
    parts: ['grilles'],
    lift: [0, 0, 2],
  },
  {
    id: 'musicRest',
    name: 'Music Rest',
    family: 'case',
    parts: ['musicRest'],
    lift: [3, 0, 3],
  },
  // Keyboard
  {
    id: 'keys',
    name: 'Keys',
    family: 'keyboard',
    parts: ['whiteKeys', 'blackKeys'],
    lift: [-5, 0, 3],
  },
  {
    id: 'whiteKeys',
    name: 'White Keys',
    family: 'keyboard',
    parts: ['whiteKeys'],
    lift: [-5, 0, 3],
    reveal: { blackKeys: [-5, 0, 6] },
  },
  {
    id: 'blackKeys',
    name: 'Black Keys',
    family: 'keyboard',
    parts: ['blackKeys'],
    lift: [-5, 0, 4],
  },
  {
    id: 'keySensors',
    name: 'Key Sensors',
    family: 'keyboard',
    parts: ['keySensors'],
    // Out in front of the keys, toward the player: raised keys would hide it.
    lift: [-11, 0, -1],
  },
  {
    id: 'keybed',
    name: 'Keybed',
    family: 'keyboard',
    parts: ['keybed'],
    lift: [-12, 0, -1],
    reveal: { keySensors: [-12, 0, -1] },
  },
  // Controls
  {
    id: 'display',
    name: 'Display',
    family: 'controls',
    parts: ['display'],
    lift: [0, 0, 2],
  },
  {
    id: 'buttons',
    name: 'Buttons',
    family: 'controls',
    parts: ['buttons'],
    lift: [0, 0, 2],
  },
  {
    id: 'dial',
    name: 'Data Dial',
    family: 'controls',
    parts: ['dial'],
    lift: [0, 0, 2],
  },
  {
    id: 'volumeKnob',
    name: 'Volume Knob',
    family: 'controls',
    parts: ['volumeKnob'],
    lift: [0, 0, 2],
  },
  {
    id: 'powerButton',
    name: 'Power Button',
    family: 'controls',
    parts: ['powerButton'],
    lift: [0, 0, 2],
  },
  {
    id: 'pitchWheel',
    name: 'Pitch Wheel',
    family: 'controls',
    parts: ['pitchWheel'],
    lift: [0, -2, 3],
  },
  // Electronics
  {
    id: 'mainBoard',
    name: 'Main Board',
    family: 'electronics',
    parts: ['mainBoard'],
    lift: [0, 0, 1.5],
    reveal: LID_OFF,
  },
  {
    id: 'speakers',
    name: 'Speakers',
    family: 'electronics',
    parts: ['speakers'],
    lift: [0, 0, 1.5],
    reveal: LID_OFF,
  },
  {
    id: 'jacks',
    name: 'Jacks',
    family: 'electronics',
    parts: ['jacks'],
    lift: [6, 0, 3],
  },
  {
    id: 'sustainPedal',
    name: 'Sustain Pedal',
    family: 'electronics',
    parts: ['sustainPedal'],
    lift: [-2, 2, -1],
  },
];

export const KEYBOARD_MODEL: InstrumentModel = {
  kind: 'keyboard',
  label: 'Electronic',
  noun: 'keyboard',
  accentKey: 'F#',
  drawScale: DRAW_SCALE,
  fixedHand: true,
  maxZoom: 3,
  parts,
  terms,
  buildOrder: [
    { term: 'case', name: 'Bottom of the Case', parts: ['bottomShell'] },
    { term: 'mainBoard', parts: ['mainBoard'] },
    { term: 'speakers', parts: ['speakers'] },
    { term: 'jacks', parts: ['jacks'] },
    { term: 'keybed', parts: ['keybed'] },
    { term: 'keySensors', parts: ['keySensors'] },
    { term: 'whiteKeys', parts: ['whiteKeys'] },
    { term: 'blackKeys', parts: ['blackKeys'] },
    { term: 'case', name: 'Top of the Case', parts: ['topShell'] },
    { term: 'grilles', parts: ['grilles'] },
    { term: 'pitchWheel', parts: ['pitchWheel'] },
    { term: 'display', parts: ['display'] },
    { term: 'buttons', parts: ['buttons'] },
    { term: 'dial', parts: ['dial'] },
    { term: 'volumeKnob', parts: ['volumeKnob'] },
    { term: 'powerButton', parts: ['powerButton'] },
    { term: 'musicRest', parts: ['musicRest'] },
    { term: 'sustainPedal', parts: ['sustainPedal'] },
  ],
};
