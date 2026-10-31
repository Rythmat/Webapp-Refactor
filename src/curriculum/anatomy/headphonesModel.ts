import type { InstrumentModel, PartDef, TermDef } from './anatomyTypes';
import {
  circle,
  lathe,
  polyFace,
  roundedRect,
  type Solid,
  type V2,
  type V3,
} from './iso';

// ── The headphones ─────────────────────────────────────────────────────────
// A generic pair of closed-back over-ear headphones, in real inches: cups 3.9"
// across, 12" from side to side. The cups face each other along v, so each side
// comes apart along that line, away from the headband: the left stack shows the
// faces toward the ear, the right stack shows the outsides. No maker's details.
//
// Explode and lift distances are in drawn units (see drawScale).

const DRAW_SCALE = 2.3;

const CUP_AXIS: V3 = [0, 1, 0];
/** Each side's parts, far from the head to near. side = −1 left, +1 right. */
type Side = -1 | 1;

const onCup = (
  side: Side,
  /** Profile as [distance from the head's centre, radius], ear side first. */
  profile: readonly (readonly [number, number, 'seam'?])[],
  more: Partial<Parameters<typeof lathe>[0]> = {},
): Solid =>
  lathe({
    origin: [0, 0, 0],
    axis: CUP_AXIS,
    profile:
      side === 1
        ? profile
        : [...profile]
            .reverse()
            .map(([t, r, seam]) =>
              seam
                ? ([-t, r, seam] as const)
                : ([-t, r] as readonly [number, number]),
            ),
    ...more,
    // The texture's stretch is along the line too, so it mirrors with the side.
    ...(side === -1 && more.from !== undefined && more.to !== undefined
      ? { from: -more.to, to: -more.from }
      : {}),
  });

/** Where a part's near face is, for marks on it. */
const faceV = (side: Side, inner: number, outer: number) =>
  side === 1 ? outer : -inner;

/** A ring of holes across a disc. */
const perforations = (v: number): V3[][] => {
  const rings: V3[][] = [];
  for (const [radius, count] of [
    [0.34, 6],
    [0.68, 12],
    [1.02, 18],
    [1.36, 24],
  ] as const) {
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      const hole = circle(0, 0, 0.055, 6);
      rings.push(
        [...hole, hole[0]].map(
          ([x, y]): V3 => [
            Math.cos(a) * radius + x,
            v,
            Math.sin(a) * radius + y,
          ],
        ),
      );
    }
  }
  return rings;
};

/** A ring drawn on a disc facing along v. */
const discRing = (v: number, radius: number, points = 28): V3[] => {
  const ring = circle(0, 0, radius, points);
  return [...ring, ring[0]].map(([x, y]): V3 => [x, v, y]);
};

const shell = (side: Side): PartDef => ({
  id: side === 1 ? 'shellRight' : 'shellLeft',
  solids: [
    side === 1
      ? onCup(
          1,
          [
            [4.9, 2.02, 'seam'],
            [5.05, 2.0],
            [5.8, 1.72],
            [6.1, 1.2, 'seam'],
          ],
          { texture: 'helix', strands: 40, from: 5.05, to: 5.8 },
        )
      : // The left shell shows its inside: open toward the ear.
        onCup(
          -1,
          [
            [4.9, 2.02, 'seam'],
            [5.05, 2.0],
            [5.8, 1.72],
            [6.1, 1.2],
          ],
          { bore: 1.74 },
        ),
  ],
  marks: side === 1 ? [discRing(6.1, 0.72)] : [discRing(-5.3, 1.1)],
  explode: [0, side * 12, 0],
});

const magnet = (side: Side): PartDef => ({
  id: side === 1 ? 'magnetRight' : 'magnetLeft',
  solids: [
    onCup(side, [
      [4.95, 0.88, 'seam'],
      [5.32, 0.88],
    ]),
  ],
  marks: [discRing(faceV(side, 4.95, 5.32), 0.42, 18)],
  explode: [0, side * 9.6, 0],
});

const voiceCoil = (side: Side): PartDef => ({
  id: side === 1 ? 'coilRight' : 'coilLeft',
  solids: [
    onCup(
      side,
      [
        [4.68, 0.56, 'seam'],
        [4.96, 0.56],
      ],
      { bore: 0.46, texture: 'helix', strands: 18, from: 4.68, to: 4.96 },
    ),
  ],
  explode: [0, side * 7.8, 0],
  hitPad: 0.1,
});

const diaphragm = (side: Side): PartDef => ({
  id: side === 1 ? 'diaphragmRight' : 'diaphragmLeft',
  solids: [
    onCup(side, [
      [4.52, 0.55],
      [4.58, 1.32, 'seam'],
      [4.72, 1.42, 'seam'],
    ]),
  ],
  marks: [
    discRing(faceV(side, 4.58, 4.72), 1.12),
    discRing(faceV(side, 4.58, 4.72), 0.58, 20),
  ],
  explode: [0, side * 6.2, 0],
});

const baffle = (side: Side): PartDef => ({
  id: side === 1 ? 'baffleRight' : 'baffleLeft',
  solids: [
    onCup(side, [
      [4.32, 1.92, 'seam'],
      [4.46, 1.94],
    ]),
  ],
  marks: perforations(faceV(side, 4.32, 4.46)),
  explode: [0, side * 4.4, 0],
});

const pad = (side: Side): PartDef => ({
  id: side === 1 ? 'padRight' : 'padLeft',
  solids: [
    onCup(
      side,
      [
        [3.2, 1.62],
        [3.45, 1.96],
        [4, 2.04, 'seam'],
        [4.32, 1.98],
      ],
      { bore: 1.05 },
    ),
  ],
  marks: side === 1 ? [] : [discRing(-3.2, 1.34, 30)],
  explode: [0, side * 2.2, 0],
});

/** An arch across the head, in (v, z). */
function arch(
  outerV: number,
  outerZ: number,
  innerV: number,
  innerZ: number,
  from: number,
  to: number,
): V2[] {
  const centre = 2.9;
  const steps = 40;
  const at = (radiusV: number, radiusZ: number, k: number): V2 => {
    const angle = from + (to - from) * k;
    return [radiusV * Math.cos(angle), centre + radiusZ * Math.sin(angle)];
  };
  const outer = Array.from({ length: steps + 1 }, (_, i) =>
    at(outerV, outerZ, i / steps),
  );
  const inner = Array.from({ length: steps + 1 }, (_, i) =>
    at(innerV, innerZ, 1 - i / steps),
  );
  return [...outer, ...inner];
}

/** The fork around a cup, in (u, z): over the top, from pivot to pivot. */
function forkOutline(): V2[] {
  const steps = 26;
  const point = (radius: number, k: number): V2 => {
    const angle = -0.1 + (Math.PI + 0.2) * k;
    return [radius * Math.cos(angle), radius * Math.sin(angle)];
  };
  return [
    ...Array.from({ length: steps + 1 }, (_, i) => point(2.34, i / steps)),
    ...Array.from({ length: steps + 1 }, (_, i) => point(2.12, 1 - i / steps)),
  ];
}

const yoke = (side: Side): PartDef => ({
  id: side === 1 ? 'yokeRight' : 'yokeLeft',
  solids: [
    {
      plane: 'side',
      outer: forkOutline(),
      z0: side === 1 ? 4.85 : -5.1,
      z1: side === 1 ? 5.1 : -4.85,
      hatch: false,
    },
  ],
  explode: [0, side * 2.2, 2],
});

const slider = (side: Side): PartDef => ({
  id: side === 1 ? 'sliderRight' : 'sliderLeft',
  solids: [
    {
      plane: 'front',
      outer: roundedRect(side * 4.98, 2.9, 0.1, 0.86, 0.04),
      z0: -0.26,
      z1: 0.26,
      hatch: false,
    },
  ],
  marks: [2.4, 2.75, 3.1, 3.45].map((z): V3[] => [
    [-0.27, side * 4.9, z],
    [-0.27, side * 5.06, z],
  ]),
  explode: [0, side * 1.4, 3.4],
  hitPad: 0.16,
});

/** The wire through the band, from cup to cup, as a line on its underside. */
const WIRE: V3[] = Array.from({ length: 37 }, (_, i) => {
  const angle = (i / 36) * Math.PI;
  return [0.5, 4.72 * Math.cos(angle), 2.9 + 4.32 * Math.sin(angle)];
});

/** The cable from the left cup, as a closed band two lines wide. */
const cableBand = (): V3[] => {
  const samples = Array.from({ length: 20 }, (_, i) => {
    const k = i / 19;
    return {
      u: 0,
      v: -5.6 + k * 3.4 + Math.sin(k * 5) * 0.5,
      z: -1.8 - k * 4.4,
    };
  });
  const w = 0.07;
  return [
    ...samples.map((p): V3 => [p.u, p.v - w, p.z]),
    ...[...samples].reverse().map((p): V3 => [p.u, p.v + w, p.z]),
  ];
};

/** The plug: sleeve, ring, ring, tip. Three rings of a stereo plug. */
const PLUG_TOP = -6.2;
const plug: PartDef = {
  id: 'plug',
  solids: [
    lathe({
      origin: [0, -2.2, 0],
      axis: [0, 0, 1],
      profile: [
        [PLUG_TOP - 1.42, 0.001],
        [PLUG_TOP - 1.34, 0.07],
        [PLUG_TOP - 1.2, 0.07, 'seam'],
        [PLUG_TOP - 0.86, 0.07, 'seam'],
        [PLUG_TOP - 0.56, 0.07, 'seam'],
        [PLUG_TOP - 0.5, 0.2, 'seam'],
        [PLUG_TOP, 0.2],
      ],
    }),
  ],
  explode: [0, 0, -2.4],
  hitPad: 0.2,
};

const stack = (side: Side) =>
  [shell, magnet, voiceCoil, diaphragm, baffle, pad].map((part) => part(side));

const parts: PartDef[] = [
  {
    id: 'cable',
    solids: [polyFace(cableBand())],
    explode: [0, 0, -1.4],
    hitPad: 0.2,
  },
  plug,
  yoke(-1),
  slider(-1),
  ...stack(-1),
  {
    id: 'cushion',
    solids: [
      {
        plane: 'front',
        outer: arch(4.82, 4.42, 4.46, 4.02, 0.55, Math.PI - 0.55),
        z0: -0.62,
        z1: 0.62,
        hatchGap: 0.26,
      },
    ],
    explode: [0, 0, 3.8],
  },
  {
    id: 'wire',
    solids: [],
    marks: [WIRE],
    explode: [0, 0, 9.4],
    hitPad: 0.15,
    lineWeight: 1.6,
  },
  {
    id: 'headband',
    solids: [
      {
        plane: 'front',
        outer: arch(5.12, 4.72, 4.84, 4.44, 0, Math.PI),
        z0: -0.72,
        z1: 0.72,
        hatchGap: 0.26,
      },
    ],
    explode: [0, 0, 6.6],
  },
  ...stack(1).reverse(),
  yoke(1),
  slider(1),
];

const BOTH = (id: string) => [`${id}Left`, `${id}Right`];
/** Apart from the head, each side its own way. */
const outward = (id: string, k: number): Record<string, V3> => ({
  [`${id}Left`]: [0, -k, 0],
  [`${id}Right`]: [0, k, 0],
});

const terms: TermDef[] = [
  // Fit
  {
    id: 'headband',
    name: 'Headband',
    family: 'fit',
    parts: ['headband'],
    lift: [0, 0, 3.4],
    reveal: { wire: [0, 0, 6] },
  },
  {
    id: 'cushion',
    name: 'Headband Cushion',
    family: 'fit',
    parts: ['cushion'],
    lift: [0, 0, -1.6],
  },
  {
    id: 'slider',
    name: 'Sliders',
    family: 'fit',
    parts: BOTH('slider'),
    lift: [0, 0, 1.4],
    liftOf: { sliderLeft: [0, -2, 1.4], sliderRight: [0, 2, 1.4] },
  },
  {
    id: 'yoke',
    name: 'Yokes',
    family: 'fit',
    parts: BOTH('yoke'),
    lift: [0, 0, 1.4],
    liftOf: { yokeLeft: [0, -3, 1.4], yokeRight: [0, 3, 1.4] },
  },
  // Ear cups
  {
    id: 'pad',
    name: 'Ear Pads',
    family: 'earcups',
    parts: BOTH('pad'),
    lift: [0, 0, 0],
    liftOf: { padLeft: [0, 3, 0], padRight: [0, -3, 0] },
  },
  {
    id: 'baffle',
    name: 'Baffles',
    family: 'earcups',
    parts: BOTH('baffle'),
    lift: [0, 0, 0],
    liftOf: { baffleLeft: [0, 3.6, 2.4], baffleRight: [0, -3.6, 2.4] },
    reveal: { ...outward('pad', -5) },
  },
  {
    id: 'shell',
    name: 'Ear Cups',
    family: 'earcups',
    parts: BOTH('shell'),
    lift: [0, 0, 0],
    liftOf: { shellLeft: [0, -5, 0], shellRight: [0, 5, 0] },
  },
  // Driver
  {
    id: 'driver',
    name: 'Driver',
    family: 'sound',
    parts: [...BOTH('diaphragm'), ...BOTH('coil'), ...BOTH('magnet')],
    lift: [0, 0, 0],
    liftOf: {
      diaphragmLeft: [0, 3, 5],
      diaphragmRight: [0, -3, 5],
      coilLeft: [0, 2, 5],
      coilRight: [0, -2, 5],
      magnetLeft: [0, 1, 5],
      magnetRight: [0, -1, 5],
    },
    anchor: [0, 4.7, 1.2],
  },
  {
    id: 'diaphragm',
    name: 'Diaphragm',
    family: 'sound',
    parts: BOTH('diaphragm'),
    lift: [0, 0, 0],
    liftOf: { diaphragmLeft: [0, 2.6, 5.2], diaphragmRight: [0, -2.6, 5.2] },
  },
  {
    id: 'voiceCoil',
    name: 'Voice Coil',
    family: 'sound',
    parts: BOTH('coil'),
    lift: [0, 0, 0],
    liftOf: { coilLeft: [0, 2.2, 5], coilRight: [0, -2.2, 5] },
  },
  {
    id: 'magnet',
    name: 'Magnet',
    family: 'sound',
    parts: BOTH('magnet'),
    lift: [0, 0, 0],
    liftOf: { magnetLeft: [0, 1.8, 5], magnetRight: [0, -1.8, 5] },
  },
  // Signal
  {
    id: 'wire',
    name: 'Internal Wire',
    family: 'signal',
    parts: ['wire'],
    lift: [0, 0, 0],
    seeThrough: ['headband', 'cushion'],
  },
  {
    id: 'cable',
    name: 'Cable',
    family: 'signal',
    parts: ['cable'],
    lift: [0, 0, -1.4],
    reveal: { plug: [0, 0, -1.4] },
  },
  {
    id: 'plug',
    name: 'Plug',
    family: 'signal',
    parts: ['plug'],
    lift: [0, 0, -2],
  },
];

export const HEADPHONES_MODEL: InstrumentModel = {
  kind: 'headphones',
  label: 'Over-Ear',
  noun: 'headphones',
  accentKey: 'Db',
  drawScale: DRAW_SCALE,
  fixedHand: true,
  maxZoom: 3,
  parts,
  terms,
  buildOrder: [
    { term: 'headband', parts: ['headband'] },
    { term: 'cushion', parts: ['cushion'] },
    { term: 'wire', parts: ['wire'] },
    { term: 'slider', parts: BOTH('slider') },
    { term: 'yoke', parts: BOTH('yoke') },
    { term: 'shell', parts: BOTH('shell') },
    { term: 'magnet', parts: BOTH('magnet') },
    { term: 'voiceCoil', parts: BOTH('coil') },
    { term: 'diaphragm', parts: BOTH('diaphragm') },
    { term: 'baffle', parts: BOTH('baffle') },
    { term: 'pad', parts: BOTH('pad') },
    { term: 'cable', parts: ['cable'] },
    { term: 'plug', parts: ['plug'] },
  ],
};
