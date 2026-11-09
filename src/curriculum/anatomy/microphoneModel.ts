import type { InstrumentModel, PartDef, TermDef } from './anatomyTypes';
import { lathe, polyFace, type V3 } from './iso';

// ── The microphone ─────────────────────────────────────────────────────────
// A handheld dynamic vocal microphone, in real inches: about 7" from the XLR
// socket to the top of a 2.2" ball grille. It lies along one tilted line, the
// head to the upper right, so the viewer looks slightly down onto each part as
// the stack comes apart along that line. Generic: no maker's shape or details.
//
// Explode and lift distances are in drawn units (see drawScale).

const DRAW_SCALE = 2;

/** The microphone's own line through space. */
const AXIS: V3 = normal([0.62, 0.2, 0.76]);
/** Across it, facing the viewer: where the switch and cable curve sit. */
const TOWARD_VIEWER: V3 = normal(rejected([-1, 1, 1], AXIS));
const ACROSS: V3 = normal(cross(AXIS, [-1, 1, 1]));

function normal(a: V3): V3 {
  const length = Math.hypot(a[0], a[1], a[2]);
  return [a[0] / length, a[1] / length, a[2] / length];
}
function rejected(a: V3, unit: V3): V3 {
  const dot = a[0] * unit[0] + a[1] * unit[1] + a[2] * unit[2];
  return [a[0] - unit[0] * dot, a[1] - unit[1] * dot, a[2] - unit[2] * dot];
}
function cross(a: V3, b: V3): V3 {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

/** A distance along the microphone, as a move. */
const along = (k: number): V3 => [AXIS[0] * k, AXIS[1] * k, AXIS[2] * k];

/** A point: so far along the microphone, so far across, so far out. */
const at = (t: number, across = 0, out = 0): V3 => [
  AXIS[0] * t + ACROSS[0] * across + TOWARD_VIEWER[0] * out,
  AXIS[1] * t + ACROSS[1] * across + TOWARD_VIEWER[1] * out,
  AXIS[2] * t + ACROSS[2] * across + TOWARD_VIEWER[2] * out,
];

const round = (
  profile: readonly (readonly [number, number, 'seam'?])[],
  more: Partial<Parameters<typeof lathe>[0]> = {},
) => lathe({ origin: [0, 0, 0], axis: AXIS, profile, ...more });

// The handle tapers toward the cable, ending in the XLR socket.
const HANDLE_TOP = 4.7;
const CAPSULE_MAGNET = 5.5;
const GRILLE_BOTTOM = 5.45;
const GRILLE_CENTER = 6.7;

/** The ball, as a profile: flat-sided toward the handle, domed on top. */
const BALL: readonly (readonly [number, number])[] = Array.from(
  { length: 13 },
  (_, i): readonly [number, number] => {
    const angle = -2.2 + (i / 12) * (2.2 + Math.PI / 2);
    return [
      GRILLE_CENTER + Math.sin(angle) * 1.1,
      Math.max(Math.cos(angle) * 1.1, 0.001),
    ];
  },
);

/** A wavy curve from the connector, as a closed band two lines wide. */
function cableBand(): V3[] {
  const halfWidth = 0.1;
  const samples = Array.from({ length: 22 }, (_, i) => {
    const k = i / 21;
    return { t: -1.4 - k * 4.2, across: Math.sin(k * 3.6) * 0.9 };
  });
  return [
    ...samples.map((p) => at(p.t, p.across - halfWidth)),
    ...[...samples].reverse().map((p) => at(p.t, p.across + halfWidth)),
  ];
}

const SWITCH_T = 2.9;

const FOAM_CENTER = GRILLE_CENTER + 0.05;
const FOAM_FLECKS: V3[][] = Array.from({ length: 70 }, (_, i) => {
  // A golden-angle spiral: even, with no visible rows.
  const ring = Math.sqrt((i + 0.5) / 70) * 0.84;
  const angle = i * 2.39996;
  const t = FOAM_CENTER + Math.sin(angle) * ring;
  const across = Math.cos(angle) * ring;
  const out = Math.sqrt(Math.max(0.846 - ring * ring, 0.01));
  return [at(t, across, out), at(t + 0.035, across + 0.035, out)];
});

const parts: PartDef[] = [
  {
    id: 'cable',
    solids: [polyFace(cableBand())],
    explode: along(-5.2),
    hitPad: 0.2,
  },
  {
    id: 'xlrConnector',
    solids: [
      round([
        [-1.55, 0.2],
        [-1.4, 0.3, 'seam'],
        [-1.35, 0.37],
        [-0.15, 0.4, 'seam'],
      ]),
    ],
    explode: along(-4.4),
    hitPad: 0.1,
  },
  {
    id: 'xlrPins',
    solids: [
      ...[
        [-0.15, 0],
        [0, 0.12],
        [0.15, 0],
      ].map(([across, out]) =>
        lathe({
          origin: at(-0.1, across, out),
          axis: AXIS,
          profile: [
            [0, 0.035],
            [0.42, 0.035],
          ],
        }),
      ),
    ],
    explode: along(-2.4),
    hitPad: 0.18,
  },
  {
    id: 'handle',
    solids: [
      round(
        [
          [0, 0.42, 'seam'],
          [0.28, 0.44, 'seam'],
          [HANDLE_TOP - 0.1, 0.72],
          [HANDLE_TOP, 0.76, 'seam'],
          [HANDLE_TOP + 0.3, 0.8, 'seam'],
          [HANDLE_TOP + 0.42, 0.62, 'seam'],
          [HANDLE_TOP + 0.75, 0.6],
        ],
        { texture: 'helix', strands: 26, from: 0.3, to: HANDLE_TOP - 0.1 },
      ),
    ],
    explode: [0, 0, 0],
  },
  {
    id: 'switch',
    solids: [
      polyFace([
        at(SWITCH_T - 0.34, -0.1, 0.61),
        at(SWITCH_T + 0.34, -0.1, 0.63),
        at(SWITCH_T + 0.34, 0.1, 0.63),
        at(SWITCH_T - 0.34, 0.1, 0.61),
      ]),
    ],
    explode: at(0, 0.6, 1.3),
    hitPad: 0.2,
  },
  {
    id: 'shockMount',
    solids: [
      round(
        [
          [5.1, 0.55, 'seam'],
          [5.2, 0.66, 'seam'],
          [6.05, 0.74],
        ],
        { bore: 0.56 },
      ),
    ],
    explode: along(2.6),
  },
  {
    id: 'magnet',
    solids: [
      round([
        [CAPSULE_MAGNET, 0.52, 'seam'],
        [CAPSULE_MAGNET + 0.42, 0.52],
      ]),
    ],
    explode: along(4.4),
  },
  {
    id: 'voiceCoil',
    solids: [
      round(
        [
          [5.95, 0.3, 'seam'],
          [6.25, 0.3],
        ],
        { bore: 0.24, texture: 'helix', strands: 14, from: 5.95, to: 6.25 },
      ),
    ],
    explode: along(6),
    hitPad: 0.1,
  },
  {
    id: 'diaphragm',
    solids: [
      round([
        [6.25, 0.58, 'seam'],
        [6.3, 0.56, 'seam'],
        [6.4, 0.38],
        [6.47, 0.001],
      ]),
    ],
    explode: along(7.4),
    hitPad: 0.08,
  },
  {
    id: 'windscreen',
    solids: [
      round(
        Array.from({ length: 11 }, (_, i): readonly [number, number] => {
          const angle = -1.4 + (i / 10) * (1.4 + Math.PI / 2);
          return [
            GRILLE_CENTER + 0.05 + Math.sin(angle) * 0.92,
            Math.max(Math.cos(angle) * 0.92, 0.001),
          ];
        }),
      ),
    ],
    // Foam: flecks across the near side, not the grille's wire lines.
    marks: FOAM_FLECKS,
    explode: along(9.8),
  },
  {
    id: 'grilleBand',
    solids: [
      round(
        [
          [GRILLE_BOTTOM, 0.84, 'seam'],
          [GRILLE_BOTTOM + 0.22, 0.87],
        ],
        { bore: 0.72 },
      ),
    ],
    explode: along(15),
    hitPad: 0.1,
  },
  {
    id: 'grille',
    solids: [round(BALL, { texture: 'mesh', strands: 18 })],
    explode: along(17),
  },
];

const CAPSULE = ['magnet', 'voiceCoil', 'diaphragm'];
const moved = (ids: readonly string[], offset: V3) =>
  Object.fromEntries(ids.map((id): [string, V3] => [id, offset]));
const HEAD = ['grilleBand', 'grille'];

const terms: TermDef[] = [
  // Head
  {
    id: 'grille',
    name: 'Grille',
    family: 'head',
    parts: ['grille'],
    lift: along(3),
  },
  {
    id: 'grilleBand',
    name: 'Grille Band',
    family: 'head',
    parts: ['grilleBand'],
    lift: along(1.6),
    reveal: { grille: along(5) },
  },
  {
    id: 'windscreen',
    name: 'Windscreen',
    family: 'head',
    parts: ['windscreen'],
    lift: along(2),
    reveal: moved(HEAD, along(5.5)),
  },
  // Capsule
  {
    id: 'capsule',
    name: 'Capsule',
    family: 'sound',
    parts: CAPSULE,
    lift: along(1.6),
    liftOf: {
      magnet: along(1),
      voiceCoil: along(2.2),
      diaphragm: along(3.4),
    },
    reveal: { windscreen: along(6.4), ...moved(HEAD, along(9)) },
    anchor: at(6.2),
  },
  {
    id: 'diaphragm',
    name: 'Diaphragm',
    family: 'sound',
    parts: ['diaphragm'],
    lift: along(2.4),
    reveal: { windscreen: along(5.4), ...moved(HEAD, along(8)) },
  },
  {
    id: 'voiceCoil',
    name: 'Voice Coil',
    family: 'sound',
    parts: ['voiceCoil'],
    lift: along(1.8),
    reveal: {
      diaphragm: along(3.8),
      windscreen: along(6.4),
      ...moved(HEAD, along(9)),
    },
  },
  {
    id: 'magnet',
    name: 'Magnet',
    family: 'sound',
    parts: ['magnet'],
    lift: along(1.4),
    reveal: {
      voiceCoil: along(2.8),
      diaphragm: along(4.2),
      windscreen: along(6.6),
      ...moved(HEAD, along(9)),
    },
  },
  {
    id: 'shockMount',
    name: 'Shock Mount',
    family: 'sound',
    parts: ['shockMount'],
    lift: along(1),
    reveal: {
      magnet: along(2.4),
      voiceCoil: along(3.4),
      diaphragm: along(4.4),
      windscreen: along(6.6),
      ...moved(HEAD, along(9)),
    },
  },
  // Body
  {
    id: 'handle',
    name: 'Handle',
    family: 'body',
    parts: ['handle'],
    lift: [0, 0, 0],
    reveal: moved(
      ['switch', 'shockMount', ...CAPSULE, 'windscreen', ...HEAD],
      along(3.6),
    ),
  },
  {
    id: 'switch',
    name: 'On/Off Switch',
    family: 'body',
    parts: ['switch'],
    lift: at(0, 0.5, 1.2),
  },
  // Signal
  {
    id: 'xlrPins',
    name: 'XLR Pins',
    family: 'signal',
    parts: ['xlrPins'],
    lift: along(-2),
    reveal: moved(['xlrConnector', 'cable'], along(-3.6)),
  },
  {
    id: 'xlrConnector',
    name: 'XLR Connector',
    family: 'signal',
    parts: ['xlrConnector'],
    lift: along(-2),
    reveal: { cable: along(-2.4) },
  },
  {
    id: 'cable',
    name: 'Cable',
    family: 'signal',
    parts: ['cable'],
    lift: along(-2.4),
  },
];

export const MICROPHONE_MODEL: InstrumentModel = {
  kind: 'microphone',
  label: 'Dynamic',
  noun: 'microphone',
  accentKey: 'C',
  drawScale: DRAW_SCALE,
  fixedHand: true,
  maxZoom: 3,
  parts,
  terms,
  buildOrder: [
    { term: 'handle', parts: ['handle'] },
    { term: 'switch', parts: ['switch'] },
    { term: 'xlrPins', parts: ['xlrPins'] },
    { term: 'shockMount', parts: ['shockMount'] },
    { term: 'magnet', parts: ['magnet'] },
    { term: 'voiceCoil', parts: ['voiceCoil'] },
    { term: 'diaphragm', parts: ['diaphragm'] },
    { term: 'windscreen', parts: ['windscreen'] },
    { term: 'grilleBand', parts: ['grilleBand'] },
    { term: 'grille', parts: ['grille'] },
    { term: 'xlrConnector', parts: ['xlrConnector'] },
    { term: 'cable', parts: ['cable'] },
  ],
};
