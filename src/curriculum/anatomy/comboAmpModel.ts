import type {
  InstrumentModel,
  ModelKind,
  PartDef,
  TermDef,
} from './anatomyTypes';
import {
  circle,
  hatchInside,
  lathe,
  roundedRect,
  type Solid,
  type V2,
  type V3,
} from './iso';

// ── The combo amp ──────────────────────────────────────────────────────────
// A generic 1×12 combo, in real inches: 24" wide, 10" deep, 20" tall, an amplifier
// and a speaker in one cabinet. The front faces the viewer's lower left (u = 0),
// and it comes apart along that line, with the chassis lifting out of the top.
// The cabinet, speaker and controls are the same on both; what differs is how the
// signal is amplified: tubes and an output transformer, or a circuit board with
// power transistors on a heat sink. No maker's shape or details.
//
// Explode and lift distances are in drawn units (see drawScale).

const DRAW_SCALE = 1.2;
const HATCH_GAP = 0.5;

const HALF = 12;
const WALL = 1;
const HEIGHT = 20;
const DEPTH = 10;

const SPEAKER_Z = 7.8;
const FORWARD: V3 = [-1, 0, 0];

const CHASSIS_Z = 16.3;
const PANEL_Z = 17;

/** Round on the line running out of the amp's front, centred on the speaker. */
const onSpeaker = (
  profile: readonly (readonly [number, number, 'seam'?])[],
  more: Partial<Parameters<typeof lathe>[0]> = {},
): Solid =>
  lathe({
    origin: [0, 0, SPEAKER_Z],
    axis: FORWARD,
    profile,
    ...more,
  });

/** A ring drawn on a face looking out of the amp's front. */
const frontRing = (u: number, v: number, z: number, r: number, points = 28) => {
  const ring = circle(v, z, r, points);
  return [...ring, ring[0]].map(([a, b]): V3 => [u, a, b]);
};

/** A knob on the control panel, facing the player. */
const knob = (v: number, r = 0.5): Solid =>
  lathe({
    origin: [0, v, PANEL_Z],
    axis: FORWARD,
    profile: [
      [-0.5, r + 0.1, 'seam'],
      [-0.42, r + 0.1, 'seam'],
      [-0.4, r],
      [0.3, r * 0.92],
    ],
  });
const knobTick = (v: number, r = 0.5): V3[] => [
  [-0.31, v, PANEL_Z + r * 0.75],
  [-0.31, v, PANEL_Z + r * 0.2],
];

const CHIP_PLANE = 15.75;
const chip = (u: number, v: number, halfU: number, halfV: number): Solid => ({
  outer: roundedRect(u, v, halfU, halfV, 0.04),
  z0: CHIP_PLANE,
  z1: CHIP_PLANE + 0.18,
  hatch: false,
});

/** A vacuum tube, hanging head down from the chassis. */
const tube = (u: number, v: number, radius: number, height: number): Solid =>
  lathe({
    origin: [u, v, CHASSIS_Z],
    axis: [0, 0, 1],
    profile: [
      [-height, 0.001],
      [-height + radius * 0.35, radius * 0.72],
      [-height + radius * 0.9, radius],
      [-0.45, radius, 'seam'],
      [-0.4, radius * 1.05, 'seam'],
      [0, radius * 1.05],
    ],
  });

/** Inside the glass: the plate, seen through it. */
const tubePlate = (
  u: number,
  v: number,
  radius: number,
  height: number,
): V3[] => {
  const low = CHASSIS_Z - height + radius * 1.1;
  const high = CHASSIS_Z - 0.7;
  const half = radius * 0.5;
  return [
    [u - radius * 0.5, v - half, low],
    [u - radius * 0.5, v + half, low],
    [u - radius * 0.5, v + half, high],
    [u - radius * 0.5, v - half, high],
    [u - radius * 0.5, v - half, low],
  ];
};

const PREAMP_TUBES: readonly V2[] = [
  [6.6, -8.6],
  [6.6, -6.4],
  [6.6, -4.2],
];
const POWER_TUBES: readonly V2[] = [
  [6.3, 0.6],
  [6.3, 3.4],
];

const RECT_GRILLE = roundedRect(0, 7.8, HALF - WALL, 6.8, 0.2);

export interface ComboSpec {
  kind: ModelKind;
  label: string;
  accentKey: string;
  tube: boolean;
}

export function comboAmpModel(spec: ComboSpec): InstrumentModel {
  const { tube: isTube } = spec;

  const sharedBack: PartDef[] = [
    {
      id: 'backPanel',
      solids: [
        {
          plane: 'front',
          outer: roundedRect(0, 17.4, HALF - WALL, 1.6, 0.08),
          z0: 9.4,
          z1: 9.9,
          hatch: false,
        },
        {
          plane: 'front',
          outer: roundedRect(0, 3.4, HALF - WALL, 2.4, 0.08),
          z0: 9.4,
          z1: 9.9,
          hatch: false,
        },
      ],
      explode: [13, 0, 0],
    },
    {
      id: 'feet',
      solids: (
        [
          [1.2, -10.4],
          [1.2, 10.4],
          [8.8, -10.4],
          [8.8, 10.4],
        ] as const
      ).map(([u, v]) => ({
        outer: circle(u, v, 0.55, 14),
        z0: -0.5,
        z1: 0,
        hatch: false,
      })),
      explode: [0, 0, -2.4],
      hitPad: 0.3,
    },
    {
      id: 'cabinetFar',
      solids: [
        {
          // The bottom and the far side: the inside of the box shows on these.
          plane: 'front',
          outer: [
            [-HALF, 0],
            [HALF, 0],
            [HALF, WALL],
            [-HALF + WALL, WALL],
            [-HALF + WALL, HEIGHT],
            [-HALF, HEIGHT],
          ],
          z0: 0,
          z1: DEPTH,
          hatchGap: HATCH_GAP,
        },
      ],
      explode: [0, 0, 0],
    },
  ];

  const reverbTank: PartDef = {
    id: 'reverbTank',
    solids: [
      {
        outer: roundedRect(6.4, 0, 1.7, 8.4, 0.1),
        z0: WALL,
        z1: WALL + 1,
        hatch: false,
      },
    ],
    marks: [5.6, 6.4, 7.2].map((u): V3[] =>
      // A spring, as a zigzag along the pan.
      Array.from({ length: 49 }, (_, i): V3 => {
        const v = -7.2 + (i / 48) * 14.4;
        return [u + (i % 2 ? 0.1 : -0.1), v, WALL + 1];
      }),
    ),
    explode: [6, 8, -3],
  };

  const speakerParts: PartDef[] = [
    {
      id: 'speakerCable',
      solids: [],
      marks: [
        [
          [5, 8, CHASSIS_Z],
          [5.4, 8, 12],
          [4.8, 4, SPEAKER_Z + 2],
          [4.4, 1.9, SPEAKER_Z],
        ],
      ],
      explode: [-1, 7, 2],
      hitPad: 0.2,
      lineWeight: 1.7,
    },
    {
      id: 'magnet',
      solids: [
        onSpeaker([
          [-6.1, 2.1, 'seam'],
          [-5.2, 2.1, 'seam'],
          [-5.1, 2.3, 'seam'],
          [-4.6, 2.3],
        ]),
      ],
      explode: [-7, 0, 0],
      hitPad: 0.1,
    },
    {
      id: 'speakerFrame',
      solids: [
        onSpeaker(
          [
            [-4.6, 2.3, 'seam'],
            [-1.6, 5.7, 'seam'],
            [-1.3, 6.05],
          ],
          { bore: 5.5 },
        ),
      ],
      explode: [-10, 0, 0],
    },
    {
      id: 'voiceCoil',
      solids: [
        onSpeaker(
          [
            [-4.5, 1, 'seam'],
            [-3.6, 1],
          ],
          { bore: 0.86, texture: 'helix', strands: 18 },
        ),
      ],
      explode: [-12.4, 0, 0],
      hitPad: 0.1,
    },
    {
      id: 'cone',
      solids: [
        onSpeaker(
          [
            [-3.6, 1.15, 'seam'],
            [-1.45, 5.3, 'seam'],
            [-1.35, 5.5],
          ],
          { bore: 1.05 },
        ),
      ],
      marks: [
        frontRing(1.4, 0, SPEAKER_Z, 5.2),
        // Its pleats, as faint radial lines.
        ...Array.from({ length: 24 }, (_, i): V3[] => {
          const a = (i / 24) * Math.PI * 2;
          return [
            [2.8, Math.cos(a) * 2.2, SPEAKER_Z + Math.sin(a) * 2.2],
            [1.5, Math.cos(a) * 5, SPEAKER_Z + Math.sin(a) * 5],
          ];
        }),
      ],
      explode: [-14.8, 0, 0],
    },
    {
      id: 'dustCap',
      solids: [
        onSpeaker([
          [-3.2, 1.1, 'seam'],
          [-2.9, 0.95],
          [-2.65, 0.45],
          [-2.6, 0.001],
        ]),
      ],
      explode: [-17.4, 0, 0],
      hitPad: 0.1,
    },
  ];

  const tubeElectronics: PartDef[] = [
    {
      id: 'preampTubes',
      solids: PREAMP_TUBES.map(([u, v]) => tube(u, v, 0.45, 2.3)),
      marks: PREAMP_TUBES.map(([u, v]) => tubePlate(u, v, 0.45, 2.3)),
      explode: [0, 0, 14],
      hitPad: 0.1,
    },
    {
      id: 'powerTubes',
      solids: POWER_TUBES.map(([u, v]) => tube(u, v, 0.8, 4.6)),
      marks: POWER_TUBES.map(([u, v]) => tubePlate(u, v, 0.8, 4.6)),
      explode: [0, 0, 14],
      hitPad: 0.1,
    },
  ];

  const solidElectronics: PartDef[] = [
    {
      id: 'circuitBoard',
      solids: [
        {
          outer: roundedRect(4.8, -3, 3.2, 7.4, 0.1),
          z0: 15.6,
          z1: CHIP_PLANE,
          hatch: false,
        },
        chip(3.2, -8, 0.42, 0.75),
        chip(3.2, -5.4, 0.42, 0.75),
        chip(3.2, -2.8, 0.42, 0.75),
        chip(6.2, -7, 0.7, 1.2),
        chip(6.2, -2.4, 0.5, 0.9),
        chip(4.8, 1.8, 0.8, 0.6),
      ],
      explode: [0, 0, 13],
    },
    {
      id: 'heatSink',
      solids: [
        {
          outer: roundedRect(6, 7.4, 1.6, 2.1, 0.04),
          z0: 13.6,
          z1: 13.9,
          hatch: false,
        },
        // Fins along it, to give up heat to the air.
        ...Array.from({ length: 9 }, (_, i) => ({
          outer: roundedRect(6, 5.5 + i * 0.475, 1.6, 0.05),
          z0: 13.9,
          z1: 15.5,
          hatch: false,
        })),
      ],
      explode: [0, 7, 15],
    },
    {
      id: 'powerTransistors',
      solids: [5.9, 6.9, 7.9, 8.9].map((v) => ({
        plane: 'front' as const,
        outer: roundedRect(v, 14.7, 0.32, 0.45, 0.04),
        z0: 4.1,
        z1: 4.4,
        hatch: false,
      })),
      explode: [-3, 7, 15],
      hitPad: 0.15,
    },
  ];

  const onChassis: PartDef[] = [
    {
      id: 'filterCaps',
      solids: (
        [
          [3.2, 5.8],
          [3.2, 7.6],
        ] as const
      ).map(([u, v]) =>
        lathe({
          origin: [u, v, CHASSIS_Z + 0.3],
          axis: [0, 0, 1],
          profile: [
            [0, 0.68, 'seam'],
            [1.7, 0.68],
          ],
        }),
      ),
      marks: [
        [
          [2.8, 5.4, CHASSIS_Z + 2],
          [3.6, 6.2, CHASSIS_Z + 2],
        ],
        [
          [2.8, 7.2, CHASSIS_Z + 2],
          [3.6, 8, CHASSIS_Z + 2],
        ],
      ],
      explode: [0, 3, 27],
      hitPad: 0.1,
    },
    {
      id: 'powerTransformer',
      solids: [
        {
          outer: roundedRect(5.6, -7, 1.7, 1.9, 0.1),
          z0: CHASSIS_Z + 0.3,
          z1: CHASSIS_Z + 2.3,
          hatchGap: 0.25,
        },
      ],
      explode: [0, -3, 27],
    },
    ...(isTube
      ? [
          {
            id: 'outputTransformer',
            solids: [
              {
                outer: roundedRect(5.6, 1.6, 1.25, 1.5, 0.1),
                z0: CHASSIS_Z + 0.3,
                z1: CHASSIS_Z + 1.9,
                hatchGap: 0.25,
              },
            ],
            explode: [0, 0, 27],
          } satisfies PartDef,
        ]
      : []),
  ];

  const panelControls: PartDef[] = [
    {
      id: 'inputJack',
      solids: [
        lathe({
          origin: [0, -9.6, PANEL_Z],
          axis: FORWARD,
          profile: [
            [-0.5, 0.4, 'seam'],
            [-0.32, 0.36],
          ],
          bore: 0.14,
        }),
      ],
      explode: [-17, 0, 6],
      hitPad: 0.2,
    },
    {
      id: 'volumeKnob',
      solids: [knob(-6.9)],
      marks: [knobTick(-6.9)],
      explode: [-17, 0, 6],
      hitPad: 0.1,
    },
    {
      id: 'toneKnobs',
      solids: [-4.2, -2.4, -0.6].map((v) => knob(v, 0.44)),
      marks: [-4.2, -2.4, -0.6].map((v) => knobTick(v, 0.44)),
      explode: [-17, 0, 6],
      hitPad: 0.1,
    },
    {
      id: 'reverbKnob',
      solids: [knob(2.3, 0.44)],
      marks: [knobTick(2.3, 0.44)],
      explode: [-17, 0, 6],
      hitPad: 0.1,
    },
    {
      id: 'powerSwitch',
      solids: [
        {
          plane: 'front',
          outer: roundedRect(8.8, PANEL_Z, 0.34, 0.5, 0.06),
          z0: 0.2,
          z1: 0.5,
          hatch: false,
        },
      ],
      explode: [-17, 0, 6],
      hitPad: 0.2,
    },
    ...(isTube
      ? [
          {
            id: 'standbySwitch',
            solids: [
              {
                plane: 'front',
                outer: roundedRect(6.9, PANEL_Z, 0.34, 0.5, 0.06),
                z0: 0.2,
                z1: 0.5,
                hatch: false,
              },
            ],
            explode: [-17, 0, 6],
            hitPad: 0.2,
          } satisfies PartDef,
        ]
      : []),
    {
      id: 'pilotLight',
      solids: [
        lathe({
          origin: [0, 10.4, PANEL_Z],
          axis: FORWARD,
          profile: [
            [-0.5, 0.3, 'seam'],
            [-0.3, 0.26, 'seam'],
            [-0.12, 0.14],
            [-0.08, 0.001],
          ],
        }),
      ],
      explode: [-17, 0, 6],
      hitPad: 0.2,
    },
  ];

  const parts: PartDef[] = [
    ...sharedBack,
    ...(isTube ? [reverbTank] : []),
    ...speakerParts,
    ...(isTube ? tubeElectronics : solidElectronics),
    {
      id: 'chassis',
      solids: [
        {
          outer: roundedRect(5, 0, 4, HALF - WALL - 0.3, 0.06),
          z0: CHASSIS_Z,
          z1: CHASSIS_Z + 0.3,
          hatch: false,
        },
      ],
      explode: [0, 0, 23],
    },
    ...onChassis,
    {
      id: 'cabinetNear',
      solids: [
        {
          // The top and the near side, in front of what's inside.
          plane: 'front',
          outer: [
            [HALF - WALL, WALL],
            [HALF, WALL],
            [HALF, HEIGHT],
            [-HALF, HEIGHT],
            [-HALF, HEIGHT - WALL],
            [HALF - WALL, HEIGHT - WALL],
          ],
          z0: 0,
          z1: DEPTH,
          hatchGap: HATCH_GAP,
        },
      ],
      explode: [0, 0, 0],
    },
    {
      id: 'baffle',
      solids: [
        {
          plane: 'front',
          outer: roundedRect(0, 7.8, HALF - WALL, 6.8, 0.1),
          holes: [circle(0, SPEAKER_Z, 5.6, 40)],
          z0: 0.45,
          z1: 1.1,
          hatch: false,
        },
      ],
      explode: [-18, -13, 0],
    },
    {
      id: 'grille',
      solids: [
        {
          plane: 'front',
          outer: RECT_GRILLE,
          z0: 0,
          z1: 0.4,
          hatch: false,
        },
      ],
      // The weave of the cloth, on its face.
      marks: [0.6, -0.6].flatMap((angle) =>
        hatchInside(RECT_GRILLE, [], 0, 0.62, angle).map((line) =>
          line.map(([v, z]): V3 => [-0.01, v, z]),
        ),
      ),
      explode: [-22, -24, 0],
    },
    {
      id: 'controlPanel',
      solids: [
        {
          plane: 'front',
          outer: roundedRect(0, PANEL_Z, HALF - WALL, 1.9, 0.1),
          z0: 0.5,
          z1: 0.8,
          hatch: false,
        },
      ],
      explode: [-14, 0, 6],
    },
    ...panelControls,
    {
      id: 'handle',
      solids: [
        {
          outer: roundedRect(5, 0, 0.65, 4, 0.5),
          z0: HEIGHT + 0.15,
          z1: HEIGHT + 0.55,
          hatch: false,
        },
        ...[-1, 1].map((side) => ({
          outer: roundedRect(5, side * 4.2, 0.85, 0.75, 0.2),
          z0: HEIGHT,
          z1: HEIGHT + 0.3,
          hatch: false,
        })),
      ],
      explode: [5, -14, 7],
      hitPad: 0.2,
    },
  ];

  const moved = (ids: readonly string[], offset: V3) =>
    Object.fromEntries(ids.map((id): [string, V3] => [id, offset]));
  /** Everything else, out where the exploded view has it. */
  const clearOf = (keep: readonly string[]) =>
    Object.fromEntries(
      parts
        .filter((p) => !keep.includes(p.id))
        .map((p): [string, V3] => [p.id, p.explode]),
    );

  // Out to the side: straight forward, they would hide the speaker.
  const FRONT_OFF: Record<string, V3> = {
    grille: [-22, -24, 0],
    baffle: [-18, -13, 0],
  };
  const ALL_INSIDE = isTube
    ? ['preampTubes', 'powerTubes']
    : ['circuitBoard', 'heatSink', 'powerTransistors'];
  const ON_CHASSIS = onChassis.map((p) => p.id);

  const speakerTerm = (
    id: string,
    name: string,
    part: string,
    lift: V3,
    reveal: Record<string, V3>,
  ): TermDef => ({
    id,
    name,
    family: 'sound',
    parts: [part],
    lift,
    reveal: { ...FRONT_OFF, ...reveal },
  });

  const LIFTED_OUT: V3 = [0, 0, 14];

  const terms: TermDef[] = [
    // Case
    {
      id: 'cabinet',
      name: 'Cabinet',
      family: 'case',
      parts: ['cabinetFar', 'cabinetNear'],
      lift: [0, 0, 0],
      reveal: clearOf(['cabinetFar', 'cabinetNear']),
    },
    {
      id: 'grille',
      name: 'Grille Cloth',
      family: 'case',
      parts: ['grille'],
      lift: [-8, 0, 0],
    },
    {
      id: 'baffle',
      name: 'Baffle',
      family: 'case',
      parts: ['baffle'],
      lift: [-7, 0, 0],
      reveal: { grille: [-13, 0, 0] },
    },
    {
      id: 'backPanel',
      name: 'Back Panels',
      family: 'case',
      parts: ['backPanel'],
      lift: [9, 0, 0],
    },
    {
      id: 'handle',
      name: 'Handle',
      family: 'case',
      parts: ['handle'],
      lift: [0, 0, 3],
    },
    {
      id: 'feet',
      name: 'Feet',
      family: 'case',
      parts: ['feet'],
      lift: [0, 0, -2.4],
    },
    // Controls
    {
      id: 'controlPanel',
      name: 'Control Panel',
      family: 'controls',
      parts: ['controlPanel'],
      lift: [-5, 0, 4],
      reveal: moved(
        panelControls.map((p) => p.id),
        [-7, 0, 4],
      ),
    },
    {
      id: 'inputJack',
      name: 'Input Jack',
      family: 'controls',
      parts: ['inputJack'],
      lift: [-4, 0, 2],
    },
    {
      id: 'volumeKnob',
      name: 'Volume',
      family: 'controls',
      parts: ['volumeKnob'],
      lift: [-4, 0, 2],
    },
    {
      id: 'toneKnobs',
      name: 'Tone Controls',
      family: 'controls',
      parts: ['toneKnobs'],
      lift: [-4, 0, 2],
    },
    {
      id: 'reverbKnob',
      name: 'Reverb',
      family: 'controls',
      parts: ['reverbKnob'],
      lift: [-4, 0, 2],
    },
    {
      id: 'powerSwitch',
      name: 'Power Switch',
      family: 'controls',
      parts: ['powerSwitch'],
      lift: [-4, 0, 2],
    },
    ...(isTube
      ? [
          {
            id: 'standbySwitch',
            name: 'Standby Switch',
            family: 'controls',
            parts: ['standbySwitch'],
            lift: [-4, 0, 2],
          } satisfies TermDef,
        ]
      : []),
    {
      id: 'pilotLight',
      name: 'Pilot Light',
      family: 'controls',
      parts: ['pilotLight'],
      lift: [-4, 0, 2],
    },
    // The sound path: how each amp makes the signal bigger.
    ...(isTube
      ? ([
          {
            id: 'preampTubes',
            name: 'Preamp Tubes',
            family: 'engine',
            parts: ['preampTubes'],
            lift: LIFTED_OUT,
            reveal: { chassis: [0, 0, 23], ...moved(ON_CHASSIS, [0, 0, 23]) },
          },
          {
            id: 'powerTubes',
            name: 'Power Tubes',
            family: 'engine',
            parts: ['powerTubes'],
            lift: LIFTED_OUT,
            reveal: { chassis: [0, 0, 23], ...moved(ON_CHASSIS, [0, 0, 23]) },
          },
          {
            id: 'outputTransformer',
            name: 'Output Transformer',
            family: 'engine',
            parts: ['outputTransformer'],
            lift: [0, 0, 8],
          },
          {
            id: 'reverbTank',
            name: 'Reverb Tank',
            family: 'engine',
            parts: ['reverbTank'],
            lift: [3, 7, -2],
          },
        ] satisfies TermDef[])
      : ([
          {
            id: 'circuitBoard',
            name: 'Circuit Board',
            family: 'engine',
            parts: ['circuitBoard'],
            lift: LIFTED_OUT,
            reveal: {
              chassis: [0, 0, 23],
              ...moved(ON_CHASSIS, [0, 0, 23]),
              heatSink: [0, 7, 15],
              powerTransistors: [-3, 7, 15],
            },
          },
          {
            id: 'powerTransistors',
            name: 'Power Transistors',
            family: 'engine',
            parts: ['powerTransistors'],
            lift: [-3, 7, 15],
            reveal: {
              chassis: [0, 0, 23],
              ...moved(ON_CHASSIS, [0, 0, 23]),
              heatSink: [0, 7, 15],
            },
          },
          {
            id: 'heatSink',
            name: 'Heat Sink',
            family: 'engine',
            parts: ['heatSink'],
            lift: [0, 7, 15],
            reveal: {
              chassis: [0, 0, 23],
              ...moved(ON_CHASSIS, [0, 0, 23]),
              powerTransistors: [-3, 7, 15],
            },
          },
        ] satisfies TermDef[])),
    // Speaker
    {
      id: 'speaker',
      name: 'Speaker',
      family: 'sound',
      parts: ['magnet', 'speakerFrame', 'voiceCoil', 'cone', 'dustCap'],
      lift: [-6, 0, 0],
      reveal: FRONT_OFF,
      anchor: [1.3, 0, SPEAKER_Z],
    },
    speakerTerm('cone', 'Cone', 'cone', [-8, 0, 0], {
      dustCap: [-10.4, 0, 0],
    }),
    speakerTerm('dustCap', 'Dust Cap', 'dustCap', [-8, 0, 0], {}),
    speakerTerm('voiceCoil', 'Voice Coil', 'voiceCoil', [-6, 0, 0], {
      cone: [-9, 0, 0],
      dustCap: [-11, 0, 0],
    }),
    speakerTerm('magnet', 'Magnet', 'magnet', [-5, 0, 0], {
      speakerFrame: [-7.5, 0, 0],
      voiceCoil: [-9.5, 0, 0],
      cone: [-11, 0, 0],
      dustCap: [-13, 0, 0],
    }),
    {
      id: 'speakerCable',
      name: 'Speaker Cable',
      family: 'sound',
      parts: ['speakerCable'],
      lift: [0, 0, 0],
      seeThrough: ['cabinetNear', 'controlPanel', 'baffle', 'grille'],
    },
    // Electronics
    {
      id: 'chassis',
      name: 'Chassis',
      family: 'electronics',
      parts: ['chassis'],
      lift: [0, 0, 23],
      reveal: {
        ...moved(ON_CHASSIS, [0, 0, 23]),
        ...moved(ALL_INSIDE, [0, 0, 23]),
      },
    },
    {
      id: 'powerTransformer',
      name: 'Power Transformer',
      family: 'electronics',
      parts: ['powerTransformer'],
      lift: [0, 0, 8],
    },
    {
      id: 'filterCaps',
      name: 'Filter Capacitors',
      family: 'electronics',
      parts: ['filterCaps'],
      lift: [0, 0, 8],
    },
  ];

  return {
    kind: spec.kind,
    label: spec.label,
    noun: 'combo amp',
    accentKey: spec.accentKey,
    drawScale: DRAW_SCALE,
    fixedHand: true,
    maxZoom: 3,
    familyOrder: ['case', 'controls', 'engine', 'sound', 'electronics'],
    parts,
    terms,
    buildOrder: [
      { term: 'cabinet', parts: ['cabinetFar', 'cabinetNear'] },
      { term: 'feet', parts: ['feet'] },
      { term: 'handle', parts: ['handle'] },
      { term: 'backPanel', parts: ['backPanel'] },
      ...(isTube ? [{ term: 'reverbTank', parts: ['reverbTank'] }] : []),
      { term: 'chassis', parts: ['chassis'] },
      { term: 'powerTransformer', parts: ['powerTransformer'] },
      { term: 'filterCaps', parts: ['filterCaps'] },
      ...(isTube
        ? [
            { term: 'outputTransformer', parts: ['outputTransformer'] },
            { term: 'preampTubes', parts: ['preampTubes'] },
            { term: 'powerTubes', parts: ['powerTubes'] },
          ]
        : [
            { term: 'circuitBoard', parts: ['circuitBoard'] },
            { term: 'heatSink', parts: ['heatSink'] },
            { term: 'powerTransistors', parts: ['powerTransistors'] },
          ]),
      { term: 'magnet', parts: ['magnet'] },
      { term: 'speaker', name: 'Speaker Frame', parts: ['speakerFrame'] },
      { term: 'voiceCoil', parts: ['voiceCoil'] },
      { term: 'cone', parts: ['cone'] },
      { term: 'dustCap', parts: ['dustCap'] },
      { term: 'speakerCable', parts: ['speakerCable'] },
      { term: 'baffle', parts: ['baffle'] },
      { term: 'grille', parts: ['grille'] },
      { term: 'controlPanel', parts: ['controlPanel'] },
      { term: 'inputJack', parts: ['inputJack'] },
      { term: 'volumeKnob', parts: ['volumeKnob'] },
      { term: 'toneKnobs', parts: ['toneKnobs'] },
      { term: 'reverbKnob', parts: ['reverbKnob'] },
      { term: 'powerSwitch', parts: ['powerSwitch'] },
      ...(isTube ? [{ term: 'standbySwitch', parts: ['standbySwitch'] }] : []),
      { term: 'pilotLight', parts: ['pilotLight'] },
    ],
  };
}

export const TUBE_AMP_MODEL = comboAmpModel({
  kind: 'tubeAmp',
  label: 'Tube',
  accentKey: 'G',
  tube: true,
});

export const SOLID_STATE_AMP_MODEL = comboAmpModel({
  kind: 'solidStateAmp',
  label: 'Solid-State',
  accentKey: 'F#',
  tube: false,
});
