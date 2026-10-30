import type { InstrumentModel, PartDef, TermDef } from './anatomyTypes';
import {
  circle,
  ringMarks,
  roundedRect,
  type Solid,
  type V2,
  type V3,
} from './iso';
import { blackKeySolids, keyboardHalf, whiteKeySolids } from './pianoKeys';

// ── The synth ──────────────────────────────────────────────────────────────
// A generic 49-key hardware synth, in real inches: about 34" wide, 15.5" deep. The
// player sits at u = 0. Its panel is laid out as its sound path, left to right
// along the back row: oscillators make the sound, the filter shapes its tone, the
// amplifier sets how loud it is. The envelope and LFO on the front row move those
// settings over time, and each section is a module that lifts out on its own.
//
// Explode and lift distances are in drawn units (see drawScale).

const DRAW_SCALE = 1.2;

const LOW = 36; // C2
const HIGH = 84; // C6
const KEYS_HALF = keyboardHalf(LOW, HIGH);
const KEYS = { frontU: 1, z: 2.5, low: LOW, high: HIGH };

const INNER_HALF = 16;
const CHEEK = 1;
const DEPTH = 15.5;
const PANEL_BACK_U = 15.2;
const PANEL_FRONT_U = 7.5;
const PANEL_Z = 3;
const PANEL_TOP = 3.2;
/** The top of a section's own plate. */
const PLATE_TOP = PANEL_TOP + 0.05;

const knob = (u: number, v: number, r = 0.42): Solid[] => [
  {
    outer: circle(u, v, r + 0.1, 20),
    z0: PLATE_TOP,
    z1: PLATE_TOP + 0.08,
    hatch: false,
  },
  {
    outer: circle(u, v, r, 20),
    z0: PLATE_TOP + 0.08,
    z1: PLATE_TOP + 0.08 + r * 1.1,
    hatch: false,
  },
];
const tick = (u: number, v: number, r = 0.42): V3[] => [
  [u - r * 0.25, v, PLATE_TOP + 0.08 + r * 1.1],
  [u - r * 0.85, v, PLATE_TOP + 0.08 + r * 1.1],
];

/** A slider: its slot on the plate, and its cap partway along. */
const slider = (
  v: number,
  position: number,
): { solids: Solid[]; marks: V3[][] } => {
  const backU = 10.4;
  const frontU = 8.2;
  const capU = frontU + (backU - frontU) * position;
  return {
    solids: [
      {
        outer: roundedRect(capU, v, 0.17, 0.3, 0.05),
        z0: PLATE_TOP,
        z1: PLATE_TOP + 0.3,
        hatch: false,
      },
    ],
    marks: [
      [
        [frontU, v, PLATE_TOP],
        [backU, v, PLATE_TOP],
      ],
    ],
  };
};

/** A section of the panel: its plate, then its controls on top. */
function section(
  id: string,
  centre: V2,
  half: V2,
  knobs: readonly (readonly [number, number, number?])[],
  explode: V3,
  extra: { solids?: Solid[]; marks?: V3[][] } = {},
): PartDef {
  return {
    id,
    solids: [
      {
        outer: roundedRect(centre[0], centre[1], half[0], half[1], 0.08),
        z0: PANEL_TOP,
        z1: PLATE_TOP,
        hatch: false,
      },
      ...(extra.solids ?? []),
      ...knobs.flatMap(([u, v, r]) => knob(u, v, r)),
    ],
    marks: [...(extra.marks ?? []), ...knobs.map(([u, v, r]) => tick(u, v, r))],
    stacked: true,
    explode,
    hitPad: 0.1,
  };
}

const BACK_ROW = 13.2;
const SECOND_ROW = 11.8;

const ENVELOPE_SLIDERS = [
  slider(-5.6, 0.2),
  slider(-4, 0.7),
  slider(-2.4, 0.55),
  slider(-0.8, 0.35),
];
const LFO_SLIDER = slider(-9.6, 0.6);

const chip = (u: number, v: number, halfU: number, halfV: number): Solid => ({
  outer: roundedRect(u, v, halfU, halfV, 0.04),
  z0: 1.15,
  z1: 1.4,
  hatch: false,
});

const CHEEK_PROFILE: V2[] = [
  [0, 0],
  [DEPTH, 0],
  [DEPTH, 3.8],
  [7.2, 3.8],
  [0.6, 2.4],
  [0, 1.5],
];
const cheek = (near: boolean): Solid => ({
  plane: 'side',
  outer: CHEEK_PROFILE,
  z0: near ? INNER_HALF : -INNER_HALF - CHEEK,
  z1: near ? INNER_HALF + CHEEK : -INNER_HALF,
  hatchGap: 0.25,
});

const WHEEL_U = 3.7;
const wheel = (id: string, v: number, explode: V3): PartDef => ({
  id,
  solids: [
    {
      plane: 'side',
      outer: circle(WHEEL_U, 1.75, 1.3, 22),
      z0: v - 0.24,
      z1: v + 0.24,
      hatch: false,
    },
  ],
  explode,
  hitPad: 0.15,
});

const parts: PartDef[] = [
  {
    id: 'cheekFar',
    solids: [cheek(false)],
    explode: [0, -5.5, 0],
  },
  {
    id: 'chassis',
    solids: [
      {
        outer: roundedRect(DEPTH / 2, 0, DEPTH / 2, INNER_HALF, 0.1),
        z0: 0,
        z1: 0.25,
      },
      {
        // The raised back, under the panel.
        outer: roundedRect(
          (PANEL_FRONT_U + DEPTH) / 2,
          0,
          (DEPTH - PANEL_FRONT_U) / 2,
          INNER_HALF,
        ),
        holes: [
          roundedRect(
            (PANEL_FRONT_U + DEPTH) / 2,
            0,
            (DEPTH - PANEL_FRONT_U) / 2 - 0.25,
            INNER_HALF - 0.25,
          ),
        ],
        z0: 0.25,
        z1: PANEL_Z,
        hatchGap: 0.25,
      },
    ],
    explode: [0, 0, 0],
  },
  {
    id: 'voiceBoard',
    solids: [
      {
        outer: roundedRect(11.4, -2.2, 3.4, 12.8, 0.1),
        z0: 1,
        z1: 1.15,
        hatch: false,
      },
      chip(10.6, -11, 0.7, 1),
      chip(12.6, -8.4, 0.5, 0.8),
      chip(10.6, -6, 0.7, 1),
      chip(12.6, -3.4, 0.5, 0.8),
      chip(10.6, -1, 0.7, 1),
      chip(12.6, 1.6, 0.5, 0.8),
      chip(10.6, 4, 0.7, 1),
      chip(12.6, 6.6, 0.5, 0.8),
    ],
    explode: [3, 0, 3],
  },
  {
    id: 'powerSupply',
    solids: [
      {
        outer: roundedRect(11.4, 13, 2.6, 1.9, 0.1),
        z0: 0.25,
        z1: 2,
        hatchGap: 0.25,
      },
    ],
    explode: [3, 3, 3],
  },
  {
    id: 'midiPorts',
    solids: [
      {
        plane: 'front',
        outer: roundedRect(-8.5, 1.6, 3.4, 0.95, 0.1),
        z0: 14.9,
        z1: 15.2,
        hatch: false,
      },
    ],
    // Round five-pin sockets: in, out and thru.
    marks: [-10.7, -8.5, -6.3].map((v): V3[] => {
      const ring = circle(v, 1.6, 0.48, 16);
      return [...ring, ring[0]].map(([a, b]): V3 => [14.85, a, b]);
    }),
    explode: [8, 0, 3.4],
    hitPad: 0.2,
  },
  {
    id: 'audioOutputs',
    solids: [
      {
        plane: 'front',
        outer: roundedRect(5.5, 1.6, 3.4, 0.95, 0.1),
        z0: 14.9,
        z1: 15.2,
        hatch: false,
      },
    ],
    marks: [3.3, 5.5, 7.7].map((v): V3[] => {
      const ring = circle(v, 1.6, 0.32, 14);
      return [...ring, ring[0]].map(([a, b]): V3 => [14.85, a, b]);
    }),
    explode: [8, 0, 3.4],
    hitPad: 0.2,
  },
  {
    id: 'keybed',
    solids: [
      {
        outer: roundedRect(4.2, 0, 3.4, KEYS_HALF + 0.3, 0.1),
        z0: 0.25,
        z1: 1.2,
        hatch: false,
      },
    ],
    explode: [-6, 0, 2.6],
  },
  {
    id: 'keySensors',
    solids: [
      {
        outer: roundedRect(5.4, 0, 0.45, KEYS_HALF, 0.1),
        z0: 1.2,
        z1: 1.32,
        hatch: false,
      },
    ],
    marks: Array.from({ length: 49 }, (_, i) =>
      ringMarks(
        5.4,
        -KEYS_HALF + (i + 0.5) * ((KEYS_HALF * 2) / 49),
        0.12,
        1.32,
        6,
      ),
    ),
    explode: [-6, 0, 4.6],
    hitPad: 0.2,
  },
  {
    id: 'whiteKeys',
    solids: whiteKeySolids(KEYS),
    tone: 'light',
    explode: [-6, 0, 6.6],
  },
  {
    id: 'blackKeys',
    solids: blackKeySolids(KEYS),
    explode: [-6, 0, 8.2],
    hitPad: 0.05,
  },
  wheel('pitchWheel', -KEYS_HALF - 1.5, [-6, -2.8, 5.4]),
  wheel('modWheel', -KEYS_HALF - 0.75, [-6, -1.4, 5.4]),
  {
    id: 'panel',
    solids: [
      {
        outer: roundedRect(
          (PANEL_FRONT_U + PANEL_BACK_U) / 2,
          0,
          (PANEL_BACK_U - PANEL_FRONT_U) / 2,
          INNER_HALF,
          0.08,
        ),
        z0: PANEL_Z,
        z1: PANEL_TOP,
        hatch: false,
      },
    ],
    explode: [2, 0, 8],
  },
  section(
    'oscillators',
    [12.55, -11],
    [2.15, 4.4],
    [
      [BACK_ROW, -14],
      [BACK_ROW, -12],
      [BACK_ROW, -10],
      [BACK_ROW, -8],
      [SECOND_ROW, -14],
      [SECOND_ROW, -12],
      [SECOND_ROW, -10],
      [SECOND_ROW, -8],
    ],
    [2, 0, 11],
  ),
  section(
    'filter',
    [12.55, -3],
    [2.15, 3],
    [
      [12.9, -3.6, 0.82],
      [13.6, -0.9],
      [11.7, -0.9],
    ],
    [3, 0, 13],
  ),
  section(
    'amplifier',
    [12.55, 2.6],
    [2.15, 2],
    [
      [13.2, 2.6],
      [11.7, 2.6],
    ],
    [4, 0, 11],
  ),
  section('display', [12.55, 8.2], [2.15, 3], [], [4, 0, 13], {
    solids: [
      {
        outer: roundedRect(12.55, 8.2, 1.5, 2.5, 0.1),
        z0: PLATE_TOP,
        z1: PLATE_TOP + 0.05,
        hatch: false,
      },
    ],
    marks: [11.9, 12.55, 13.2].map((u, i): V3[] => [
      [u, 6.2, PLATE_TOP + 0.05],
      [u, 6.2 + 3.8 - i * 0.8, PLATE_TOP + 0.05],
    ]),
  }),
  section(
    'masterVolume',
    [12.55, 13.4],
    [2.15, 2.1],
    [[12.55, 13.4, 0.82]],
    [5, 2, 11],
  ),
  section(
    'lfo',
    [9.25, -11.5],
    [1.45, 3.9],
    [
      [9.3, -14],
      [9.3, -12],
    ],
    [0, 0, 9],
    {
      solids: LFO_SLIDER.solids,
      marks: LFO_SLIDER.marks,
    },
  ),
  section('envelope', [9.25, -3.2], [1.45, 3.7], [], [0, 0, 11], {
    solids: ENVELOPE_SLIDERS.flatMap((s) => s.solids),
    marks: ENVELOPE_SLIDERS.flatMap((s) => s.marks),
  }),
  {
    id: 'presetButtons',
    solids: Array.from({ length: 8 }, (_, i) => ({
      outer: roundedRect(9.25, 2 + i * 1.75, 0.5, 0.62, 0.08),
      z0: PANEL_TOP,
      z1: PANEL_TOP + 0.16,
      hatch: false,
    })),
    explode: [1, 0, 9],
    hitPad: 0.1,
  },
  {
    id: 'cheekNear',
    solids: [cheek(true)],
    explode: [0, 5.5, 0],
  },
];

const SECTIONS = [
  'oscillators',
  'filter',
  'amplifier',
  'display',
  'masterVolume',
  'lfo',
  'envelope',
  'presetButtons',
];
const raised = (ids: readonly string[], offset: V3) =>
  Object.fromEntries(ids.map((id): [string, V3] => [id, offset]));
/** The panel and all that's on it, out of the way of the boards beneath. */
const PANEL_OFF = raised(['panel', ...SECTIONS], [2, 0, 7]);

const sectionTerm = (
  id: string,
  name: string,
  lift: V3 = [0, 0, 3],
): TermDef => ({
  id,
  name,
  family: 'engine',
  parts: [id],
  lift,
});

const terms: TermDef[] = [
  // Case
  {
    id: 'chassis',
    name: 'Chassis',
    family: 'case',
    parts: ['chassis'],
    lift: [0, 0, 0],
    reveal: {
      ...PANEL_OFF,
      voiceBoard: [2, 0, 4],
      powerSupply: [2, 0, 4],
      whiteKeys: [-6, 0, 3],
      blackKeys: [-6, 0, 3],
      keySensors: [-6, 0, 3],
      keybed: [-6, 0, 3],
      pitchWheel: [-6, 0, 3],
      modWheel: [-6, 0, 3],
    },
  },
  {
    id: 'cheeks',
    name: 'End Cheeks',
    family: 'case',
    parts: ['cheekFar', 'cheekNear'],
    lift: [0, 0, 0],
    liftOf: { cheekFar: [0, -3, 0], cheekNear: [0, 3, 0] },
  },
  {
    id: 'panel',
    name: 'Front Panel',
    family: 'case',
    parts: ['panel'],
    lift: PANEL_OFF.panel,
    reveal: PANEL_OFF,
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
  // Sound engine, in the order the sound passes through it.
  sectionTerm('oscillators', 'Oscillators'),
  sectionTerm('filter', 'Filter'),
  sectionTerm('amplifier', 'Amplifier'),
  sectionTerm('envelope', 'Envelope'),
  sectionTerm('lfo', 'LFO'),
  // Controls
  {
    id: 'pitchWheel',
    name: 'Pitch Wheel',
    family: 'controls',
    parts: ['pitchWheel'],
    lift: [-3, -2, 3],
  },
  {
    id: 'modWheel',
    name: 'Mod Wheel',
    family: 'controls',
    parts: ['modWheel'],
    lift: [-3, -2, 3],
  },
  {
    id: 'masterVolume',
    name: 'Master Volume',
    family: 'controls',
    parts: ['masterVolume'],
    lift: [0, 0, 3],
  },
  {
    id: 'display',
    name: 'Display',
    family: 'controls',
    parts: ['display'],
    lift: [0, 0, 3],
  },
  {
    id: 'presetButtons',
    name: 'Preset Buttons',
    family: 'controls',
    parts: ['presetButtons'],
    lift: [0, 0, 3],
  },
  // Electronics
  {
    id: 'voiceBoard',
    name: 'Voice Board',
    family: 'electronics',
    parts: ['voiceBoard'],
    lift: [0, 0, 1.5],
    reveal: PANEL_OFF,
  },
  {
    id: 'powerSupply',
    name: 'Power Supply',
    family: 'electronics',
    parts: ['powerSupply'],
    lift: [0, 0, 1.5],
    reveal: PANEL_OFF,
  },
  {
    id: 'audioOutputs',
    name: 'Audio Outputs',
    family: 'electronics',
    parts: ['audioOutputs'],
    lift: [6, 0, 3],
  },
  {
    id: 'midiPorts',
    name: 'MIDI Ports',
    family: 'electronics',
    parts: ['midiPorts'],
    lift: [6, 0, 3],
  },
];

export const SYNTH_MODEL: InstrumentModel = {
  kind: 'synth',
  label: 'Hardware',
  noun: 'synth',
  accentKey: 'F',
  drawScale: DRAW_SCALE,
  fixedHand: true,
  maxZoom: 3,
  parts,
  terms,
  buildOrder: [
    { term: 'chassis', parts: ['chassis'] },
    { term: 'powerSupply', parts: ['powerSupply'] },
    { term: 'voiceBoard', parts: ['voiceBoard'] },
    { term: 'audioOutputs', parts: ['audioOutputs'] },
    { term: 'midiPorts', parts: ['midiPorts'] },
    { term: 'keybed', parts: ['keybed'] },
    { term: 'keySensors', parts: ['keySensors'] },
    { term: 'whiteKeys', parts: ['whiteKeys'] },
    { term: 'blackKeys', parts: ['blackKeys'] },
    { term: 'pitchWheel', parts: ['pitchWheel'] },
    { term: 'modWheel', parts: ['modWheel'] },
    { term: 'panel', parts: ['panel'] },
    { term: 'oscillators', parts: ['oscillators'] },
    { term: 'filter', parts: ['filter'] },
    { term: 'amplifier', parts: ['amplifier'] },
    { term: 'envelope', parts: ['envelope'] },
    { term: 'lfo', parts: ['lfo'] },
    { term: 'masterVolume', parts: ['masterVolume'] },
    { term: 'display', parts: ['display'] },
    { term: 'presetButtons', parts: ['presetButtons'] },
    { term: 'cheeks', parts: ['cheekFar', 'cheekNear'] },
  ],
};
