import { lathe, polyFace, type Solid, type V3 } from '@/curriculum/anatomy/iso';
import {
  box,
  frontFace,
  frontRing,
  jackCollar,
  sideFace,
  spot,
  topKnob,
  topRing,
  visual,
  type GearMover,
  type GearVisual,
  type PartSpec,
} from './shapes';

// ── The gear between the instruments and the speakers ──────────────────────
// Real proportions, in inches. Everything is laid out so the jacks are on a
// face the viewer can see: a stompbox's top-mounted jacks, a small mixer's
// jacks on the rise of its top panel.

const FORWARD: V3 = [-1, 0, 0];
const UP: V3 = [0, 0, 1];

// ── Stompbox ───────────────────────────────────────────────────────────────

export function stompboxVisual(knobs: 1 | 2 | 3, accent?: 'wide'): GearVisual {
  const U = 2.3;
  const V = accent === 'wide' ? 1.7 : 1.45;
  const H = 1.25;
  const knobSpots: Record<number, number[]> = {
    1: [0],
    2: [-0.7, 0.7],
    3: [-0.85, 0, 0.85],
  };
  return visual(
    [
      {
        id: 'case',
        solids: [box(-U, U, -V, V, 0, H, 0.22, 0.32)],
        marks: [
          // The break between the slope and the switch deck.
          [
            [-0.4, -V, H],
            [-0.4, V, H],
          ],
        ],
      },
      {
        id: 'knobs',
        stacked: true,
        solids: knobSpots[knobs].map((v) => topKnob(0.5, v, H, 0.34, 0.42)),
      },
      {
        id: 'led',
        solids: [
          lathe({
            origin: [-0.6, 0, H],
            axis: UP,
            profile: [
              [0, 0.13],
              [0.1, 0.1],
            ],
          }),
        ],
      },
      {
        id: 'footswitch',
        solids: [
          lathe({
            origin: [-1.4, 0, H],
            axis: UP,
            profile: [
              [0, 0.42],
              [0.1, 0.42, 'seam'],
              [0.2, 0.3],
              [0.34, 0.3],
              [0.42, 0.22],
            ],
          }),
        ],
      },
      {
        id: 'jacks',
        stacked: true,
        solids: [
          jackCollar([1.75, 0.85, H], UP, 0.22),
          jackCollar([1.75, -0.85, H], UP, 0.22),
        ],
      },
    ],
    {
      in: spot([1.75, 0.85, H + 0.15], UP),
      out: spot([1.75, -0.85, H + 0.15], UP),
    },
    { scale: 3 },
  );
}

// ── DI box ─────────────────────────────────────────────────────────────────

export function diVisual(): GearVisual {
  const U = 1.3;
  const V = 2.3;
  const H = 1.6;
  return visual(
    [
      { id: 'case', solids: [box(-U, U, -V, V, 0, H, 0.12, 0.3)] },
      {
        id: 'lift',
        solids: [box(-0.25, 0.25, 0.9, 1.5, H, H + 0.05, 0.05, 9)],
        marks: [
          [
            [0, 1, H + 0.05],
            [0, 1.4, H + 0.05],
          ],
        ],
      },
      {
        id: 'jacks',
        stacked: true,
        solids: [
          frontFace(-U - 0.01, -V + 0.3, V - 0.3, 0.2, H - 0.2),
          jackCollar([-U, 1.15, H / 2], FORWARD, 0.27),
          jackCollar([-U, -1.15, H / 2], FORWARD, 0.4),
        ],
        marks: [
          // An XLR's three pins.
          frontRing(-U - 0.2, -1.15, H / 2 + 0.12, 0.04, 8),
          frontRing(-U - 0.2, -1.27, H / 2 - 0.08, 0.04, 8),
          frontRing(-U - 0.2, -1.03, H / 2 - 0.08, 0.04, 8),
        ],
      },
    ],
    {
      in: spot([-U - 0.15, 1.15, H / 2], FORWARD),
      out: spot([-U - 0.15, -1.15, H / 2], FORWARD),
    },
    { scale: 3 },
  );
}

// ── Audio interface ────────────────────────────────────────────────────────

export function interfaceVisual(): GearVisual {
  const U = 2.7;
  const V = 4.1;
  const H = 1.8;
  return visual(
    [
      { id: 'case', solids: [box(-U, U, -V, V, 0, H, 0.2, 0.34)] },
      {
        id: 'top',
        stacked: true,
        solids: [
          topKnob(-0.7, -2.8, H, 0.62, 0.55),
          topKnob(-0.7, -0.9, H, 0.62, 0.55),
          topKnob(0.3, 2.3, H, 1.05, 0.7),
          lathe({
            origin: [1, -1.9, H],
            axis: UP,
            profile: [
              [0, 0.26],
              [0.1, 0.22],
            ],
          }),
        ],
        marks: [
          // The two input meters.
          [
            [1.3, -3.4, H],
            [1.3, -2.4, H],
          ],
          [
            [1.3, -1.4, H],
            [1.3, -0.4, H],
          ],
          [
            [1.7, -3.4, H],
            [1.7, -0.4, H],
          ],
        ],
      },
      {
        id: 'front',
        stacked: true,
        solids: [
          frontFace(-U - 0.01, -V + 0.2, V - 0.2, 0.15, H - 0.15),
          jackCollar([-U, -2.8, H / 2], FORWARD, 0.42),
          jackCollar([-U, -0.9, H / 2], FORWARD, 0.42),
          jackCollar([-U, 2.8, H / 2], FORWARD, 0.26),
        ],
      },
      {
        id: 'back',
        stacked: true,
        solids: [
          sideFace(V + 0.01, -U + 0.4, U - 0.4, 0.2, H - 0.2),
          jackCollar([-1, V, H / 2], [0, 1, 0], 0.26),
        ],
        marks: [
          // The USB port's squared mouth.
          [
            [0.6, V + 0.02, H / 2 - 0.22],
            [1.4, V + 0.02, H / 2 - 0.22],
            [1.4, V + 0.02, H / 2 + 0.22],
            [0.6, V + 0.02, H / 2 + 0.22],
            [0.6, V + 0.02, H / 2 - 0.22],
          ],
        ],
      },
    ],
    {
      in1: spot([-U - 0.15, -2.8, H / 2], FORWARD),
      in2: spot([-U - 0.15, -0.9, H / 2], FORWARD),
      phones: spot([-U - 0.15, 2.8, H / 2], FORWARD),
      mon: spot([-1, V + 0.15, H / 2], [0, 1, 0]),
      usb: spot([1, V + 0.05, H / 2], [0, 1, 0]),
    },
    { scale: 2.5 },
  );
}

// ── Laptop ─────────────────────────────────────────────────────────────────

export function laptopVisual(): GearVisual {
  const U = 4.4;
  const V = 6.2;
  const T = 0.42;
  const LEAN = 0.26;
  const HIGH = 8.2;
  const hinge = U - 0.1;
  const screenAt = (t: number, v: number): V3 => [
    hinge + Math.sin(LEAN) * HIGH * t,
    v,
    T + Math.cos(LEAN) * HIGH * t,
  ];
  // A timeline of tracks on the screen.
  const lanes: V3[][] = [];
  for (let i = 1; i < 5; i++) {
    lanes.push([
      screenAt(0.14 + i * 0.16, -V + 0.8),
      screenAt(0.14 + i * 0.16, V - 0.8),
    ]);
  }
  const blocks: V3[][] = [];
  const clip = (t0: number, t1: number, v0: number, v1: number): V3[] => [
    screenAt(t0, v0),
    screenAt(t0, v1),
    screenAt(t1, v1),
    screenAt(t1, v0),
    screenAt(t0, v0),
  ];
  blocks.push(
    clip(0.33, 0.45, -3.6, 0.6),
    clip(0.49, 0.61, -1.6, 3),
    clip(0.65, 0.77, -4.6, -1.8),
    clip(0.65, 0.77, 0, 4.2),
  );
  return visual(
    [
      {
        id: 'screen',
        solids: [
          polyFace([
            screenAt(0, -V),
            screenAt(0, V),
            screenAt(1, V),
            screenAt(1, -V),
          ]),
          polyFace([
            screenAt(0.06, -V + 0.3),
            screenAt(0.06, V - 0.3),
            screenAt(0.95, V - 0.3),
            screenAt(0.95, -V + 0.3),
          ]),
        ],
        marks: [...lanes, ...blocks],
        stacked: true,
      },
      {
        id: 'base',
        solids: [box(-U, U, -V, V, 0, T, 0.3, 0.3)],
        marks: [
          // The keyboard's rows, and the trackpad.
          ...Array.from({ length: 5 }, (_, i): V3[] => [
            [0.2 + i * 0.75, -V + 0.8, T],
            [0.2 + i * 0.75, V - 0.8, T],
          ]),
          ...Array.from({ length: 13 }, (_, i): V3[] => [
            [0.2, -V + 0.8 + i * 0.88, T],
            [3.2, -V + 0.8 + i * 0.88, T],
          ]),
          [
            [-3.8, -1.8, T],
            [-0.8, -1.8, T],
            [-0.8, 1.8, T],
            [-3.8, 1.8, T],
            [-3.8, -1.8, T],
          ],
        ],
      },
      {
        id: 'ports',
        solids: [],
        marks: [
          [
            [-3.4, V + 0.01, 0.1],
            [-2.6, V + 0.01, 0.1],
            [-2.6, V + 0.01, 0.32],
            [-3.4, V + 0.01, 0.32],
            [-3.4, V + 0.01, 0.1],
          ],
          [
            [1.4, V + 0.01, 0.1],
            [2.2, V + 0.01, 0.1],
            [2.2, V + 0.01, 0.32],
            [1.4, V + 0.01, 0.32],
            [1.4, V + 0.01, 0.1],
          ],
        ],
      },
    ],
    {
      usb1: spot([-3, V + 0.05, 0.21], [0, 1, 0]),
      usb2: spot([1.8, V + 0.05, 0.21], [0, 1, 0]),
    },
    { scale: 2 },
  );
}

// ── Stage box ──────────────────────────────────────────────────────────────

export function stageBoxVisual(): GearVisual {
  const U = 3.2;
  const V = 9;
  const H = 2.6;
  const inputs: Solid[] = [];
  const pins: V3[][] = [];
  const ports: Record<string, ReturnType<typeof spot>> = {};
  for (let i = 0; i < 8; i++) {
    const v = -V + 2 + (i % 4) * 4.4;
    const u = i < 4 ? 1.1 : -1.1;
    inputs.push(jackCollar([u, v, H], UP, 0.42));
    pins.push(
      topRing(u + 0.12, v, H + 0.22, 0.04, 8),
      topRing(u - 0.08, v - 0.12, H + 0.22, 0.04, 8),
      topRing(u - 0.08, v + 0.12, H + 0.22, 0.04, 8),
    );
    ports[`in${i + 1}`] = spot([u, v, H + 0.25], UP);
  }
  return visual(
    [
      {
        id: 'case',
        solids: [box(-U, U, -V, V, 0, H, 0.15, 0.42)],
        marks: [
          // A carrying handle's recess at each end isn't worth more than this.
          [
            [-U + 0.4, -V + 0.3, H],
            [U - 0.4, -V + 0.3, H],
          ],
        ],
      },
      { id: 'inputs', stacked: true, solids: inputs, marks: pins },
      {
        id: 'tail',
        stacked: true,
        solids: [
          sideFace(V + 0.01, -2, 2, 0.3, H - 0.3),
          jackCollar([0, V, H / 2], [0, 1, 0], 0.72),
        ],
      },
    ],
    {
      ...ports,
      multi: spot([0, V + 0.3, H / 2], [0, 1, 0]),
    },
    { scale: 1.3 },
  );
}

// ── Mixer ──────────────────────────────────────────────────────────────────

/** Height of the sloped top at a distance along u. */
const mixerRise = (
  u: number,
  low: number,
  high: number,
  u0: number,
  u1: number,
) => low + ((u - u0) / (u1 - u0)) * (high - low);

export function mixerVisual(channels: number): GearVisual {
  const STRIP = 1.8;
  const MASTER = 3.4;
  const width = channels * STRIP + MASTER + 0.8;
  const V0 = -width / 2;
  const U0 = -5.5;
  const U1 = 5.5;
  const LOW = 0.9;
  const HIGH = 2.9;
  const at = (u: number) => mixerRise(u, LOW, HIGH, U0, U1);
  const onTop = (u: number, v: number, lift = 0): V3 => [u, v, at(u) + lift];
  const stripV = (ch: number) => V0 + 0.6 + (ch - 0.5) * STRIP;

  const specs: PartSpec[] = [
    {
      id: 'case',
      solids: [
        {
          outer: [
            [U0, 0],
            [U1, 0],
            [U1, HIGH],
            [U0, LOW],
          ],
          z0: V0,
          z1: -V0,
          plane: 'side',
          hatchGap: 0.5,
        },
      ],
    },
  ];

  const ports: Record<string, ReturnType<typeof spot>> = {};
  const jackSolids: Solid[] = [];
  const knobSolids: Solid[] = [];
  const stripMarks: V3[][] = [];
  const movers: GearMover[] = [];
  const faderSlot = { u0: -4.6, u1: -0.3 };

  for (let ch = 1; ch <= channels; ch++) {
    const v = stripV(ch);
    jackSolids.push(jackCollar(onTop(4.3, v), UP, 0.36));
    ports[`ch${ch}`] = spot(onTop(4.3, v, 0.2), UP);
    knobSolids.push(
      topKnob(2.3, v, at(2.3), 0.38, 0.34),
      topKnob(0.9, v, at(0.9), 0.3, 0.3),
    );
    stripMarks.push(
      // The fader's slot.
      [onTop(faderSlot.u0, v), onTop(faderSlot.u1, v)],
      [onTop(faderSlot.u0, v - 0.06), onTop(faderSlot.u1, v - 0.06)],
      // The strip's edge.
      [onTop(U0 + 0.2, v + STRIP / 2), onTop(U1 - 0.2, v + STRIP / 2)],
    );
    specs.push({
      id: `cap${ch}`,
      solids: [box(-0.34, 0.34, -0.52, 0.52, 0, 0.3, 0.06, 0.18)].map(
        (solid) => ({
          ...solid,
          outer: solid.outer.map(([u, w]) => [u - 2.45, w + v] as const),
          z0: at(-2.45),
          z1: at(-2.45) + 0.3,
        }),
      ),
    });
    movers.push({
      type: 'fader',
      part: `cap${ch}`,
      control: `fader${ch}`,
      min: -40,
      max: 6,
      travel: [
        (faderSlot.u1 - faderSlot.u0) * 0.92,
        0,
        at(faderSlot.u1) - at(faderSlot.u0),
      ],
    });
  }

  // The master section, at the near end.
  const masterV = V0 + 0.6 + channels * STRIP + MASTER / 2;
  jackSolids.push(
    jackCollar(onTop(4.3, masterV - 0.9), UP, 0.36),
    jackCollar(onTop(4.3, masterV + 0.9), UP, 0.36),
  );
  ports.main = spot(onTop(4.3, masterV - 0.9, 0.2), UP);
  ports.aux = spot(onTop(4.3, masterV + 0.9, 0.2), UP);
  knobSolids.push(topKnob(0.9, masterV + 0.9, at(0.9), 0.34, 0.32));
  stripMarks.push(
    [onTop(faderSlot.u0, masterV - 0.9), onTop(faderSlot.u1, masterV - 0.9)],
    [onTop(faderSlot.u0, masterV - 0.96), onTop(faderSlot.u1, masterV - 0.96)],
  );
  // A level meter of short bars.
  for (let i = 0; i < 9; i++) {
    const u = -3.8 + i * 0.42;
    stripMarks.push([onTop(u, masterV + 0.5), onTop(u, masterV + 1.3)]);
  }
  specs.push(
    { id: 'jacks', stacked: true, solids: jackSolids, marks: stripMarks },
    { id: 'knobs', stacked: true, solids: knobSolids },
    {
      id: 'capMain',
      solids: [box(-0.34, 0.34, -0.52, 0.52, 0, 0.3, 0.06, 0.18)].map(
        (solid) => ({
          ...solid,
          outer: solid.outer.map(
            ([u, w]) => [u - 2, w + masterV - 0.9] as const,
          ),
          z0: at(-2),
          z1: at(-2) + 0.3,
        }),
      ),
    },
    {
      id: 'mains',
      stacked: true,
      solids: [
        sideFace(-V0 + 0.01, 2.4, 4.8, 0.3, 2),
        jackCollar([3.6, -V0, 1.1], [0, 1, 0], 0.3),
      ],
    },
  );
  if (channels > 4) {
    specs.push({
      id: 'multi',
      stacked: true,
      solids: [
        sideFace(-V0 + 0.02, -2.4, 1.2, 0.2, 1.3),
        jackCollar([-0.6, -V0, 0.75], [0, 1, 0], 0.42),
      ],
    });
    ports.multi = spot([-0.6, -V0 + 0.25, 0.75], [0, 1, 0]);
  }
  ports.power = spot([3.6, -V0 + 0.15, 1.1], [0.2, 1, -0.2]);

  return visual(specs, ports, {
    scale: channels > 4 ? 1.55 : 1.9,
    movers,
  });
}

// ── Power strip ────────────────────────────────────────────────────────────

export function powerStripVisual(): GearVisual {
  const U = 1.2;
  const V = 5.6;
  const H = 1.1;
  const sockets: V3[][] = [];
  const ports: Record<string, ReturnType<typeof spot>> = {};
  for (let i = 0; i < 4; i++) {
    const v = -3.6 + i * 2.4;
    sockets.push(topRing(0, v, H, 0.68, 20));
    ports[`socket${i + 1}`] = spot([0, v, H + 0.1], UP);
  }
  return visual(
    [
      {
        id: 'case',
        solids: [box(-U, U, -V, V, 0, H, 0.3, 0.3)],
        marks: sockets,
      },
      {
        id: 'switch',
        solids: [box(-0.3, 0.3, 4.4, 5.2, H, H + 0.1, 0.05, 9)],
      },
    ],
    ports,
    { scale: 2.2 },
  );
}

// ── Condenser mic on a short stand ─────────────────────────────────────────

export function condenserVisual(): GearVisual {
  const axis: V3 = UP;
  return visual(
    [
      {
        id: 'stand',
        stacked: true,
        solids: [
          lathe({
            origin: [0, 0, 0],
            axis,
            profile: [
              [0, 3.2],
              [0.3, 3.2, 'seam'],
              [0.5, 0.5],
              [9, 0.32],
            ],
          }),
        ],
      },
      {
        id: 'body',
        stacked: true,
        solids: [
          lathe({
            origin: [0, 0, 9],
            axis,
            profile: [
              [0, 0.72],
              [0.4, 1.02],
              [3.8, 1.02, 'seam'],
            ],
            texture: 'helix',
            strands: 10,
            from: 0.5,
            to: 3.6,
          }),
          lathe({
            origin: [0, 0, 12.8],
            axis,
            profile: [
              [0, 1.02],
              [0.3, 1.2, 'seam'],
              [1.6, 1.28],
              [3, 1.1],
              [3.6, 0.5],
            ],
            texture: 'mesh',
            strands: 14,
          }),
        ],
        marks: [
          [
            [-1.05, 0.05, 12.85],
            [-1.25, 0.05, 15.8],
          ],
        ],
      },
    ],
    { out: spot([0, 0.9, 9.4], [0.1, 1, -0.4]) },
    { scale: 1.8 },
  );
}
