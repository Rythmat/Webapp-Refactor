import {
  lathe,
  polyFace,
  roundedRect,
  type V3,
} from '@/curriculum/anatomy/iso';
import {
  box,
  frontFace,
  frontRing,
  jackCollar,
  sideFace,
  sideRing,
  spot,
  visual,
  type GearVisual,
} from './shapes';

// ── Speakers ───────────────────────────────────────────────────────────────
// In real inches: a 15" powered PA speaker, a floor wedge, a nearfield monitor.
// A PA's jacks are really on its back; here the plate is on the side you can
// see, because the point is what plugs into it.

const FORWARD: V3 = [-1, 0, 0];

/** A woofer, seen from the front: basket ring, surround, cone, dust cap. */
const woofer = (
  u: number,
  v: number,
  z: number,
  r: number,
  axis = FORWARD,
) => ({
  ring: lathe({
    origin: [u, v, z],
    axis,
    profile: [
      [0, r * 1.06],
      [r * 0.06, r * 1.06, 'seam'],
      [r * 0.06, r * 0.9],
    ],
    bore: r * 0.9,
  }),
  cone: lathe({
    origin: [u + r * 0.34, v, z],
    axis,
    profile: [
      [0, r * 0.3],
      [r * 0.26, r * 0.72, 'seam'],
      [r * 0.36, r * 0.94, 'seam'],
    ],
  }),
  cap: lathe({
    origin: [u + r * 0.3, v, z],
    axis,
    profile: [
      [0, r * 0.3],
      [r * 0.08, r * 0.26],
      [r * 0.13, r * 0.14],
      [r * 0.15, 0.01],
    ],
  }),
});

export function speakerVisual(): GearVisual {
  const W = 9;
  const D = 13;
  const H = 27;
  const Z = 21;
  const top = Z + H;
  const speaker = woofer(0, 0, Z + 10, 7.2);
  const plate = { v: W };
  return visual(
    [
      {
        id: 'stand',
        stacked: true,
        solids: [
          lathe({
            origin: [D / 2, 0, 3],
            axis: [0, 0, 1],
            profile: [
              [0, 0.75],
              [Z - 3, 0.75],
            ],
          }),
          lathe({
            origin: [D / 2, 0, 10],
            axis: [0, 0, 1],
            profile: [
              [0, 1.05],
              [1.4, 1.05, 'seam'],
            ],
          }),
        ],
        marks: [
          [
            [D / 2, 0, 10],
            [D / 2 - 11, 0, 0],
          ],
          [
            [D / 2, 0, 10],
            [D / 2 + 5.5, 9.5, 0],
          ],
          [
            [D / 2, 0, 10],
            [D / 2 + 5.5, -9.5, 0],
          ],
        ],
      },
      {
        id: 'cabinet',
        solids: [
          {
            outer: roundedRect(0, Z + H / 2, W, H / 2, 1.1),
            z0: 0,
            z1: D,
            plane: 'front',
            hatchGap: 1.1,
          },
        ],
      },
      {
        id: 'ampPlate',
        solids: [sideFace(plate.v + 0.02, 2.2, 10.8, Z + 3, Z + 15)],
        marks: [
          sideRing(plate.v + 0.02, 6.4, Z + 13.1, 0.62),
          sideRing(plate.v + 0.02, 9.2, Z + 13.1, 0.62),
        ],
      },
      {
        id: 'jacks',
        solids: [
          jackCollar([3.8, plate.v, Z + 10.4], [0, 1, 0], 0.72),
          jackCollar([9.4, plate.v, Z + 4.6], [0, 1, 0], 0.5),
        ],
        stacked: true,
      },
      {
        id: 'baffle',
        solids: [frontFace(-0.01, -W + 0.8, W - 0.8, Z + 0.8, top - 0.8)],
      },
      { id: 'surround', solids: [speaker.ring] },
      { id: 'cone', solids: [speaker.cone, speaker.cap], stacked: true },
      {
        id: 'horn',
        solids: [
          polyFace([
            [-0.02, -5, top - 7.4],
            [-0.02, 5, top - 7.4],
            [-0.02, 5, top - 1.7],
            [-0.02, -5, top - 1.7],
          ]),
          polyFace([
            [0.5, -2.2, top - 5.9],
            [0.5, 2.2, top - 5.9],
            [0.5, 2.2, top - 3.2],
            [0.5, -2.2, top - 3.2],
          ]),
        ],
        marks: [
          [
            [-0.02, -5, top - 7.4],
            [0.5, -2.2, top - 5.9],
          ],
          [
            [-0.02, 5, top - 7.4],
            [0.5, 2.2, top - 5.9],
          ],
          [
            [-0.02, 5, top - 1.7],
            [0.5, 2.2, top - 3.2],
          ],
          [
            [-0.02, -5, top - 1.7],
            [0.5, -2.2, top - 3.2],
          ],
        ],
        stacked: true,
      },
      {
        id: 'handle',
        solids: [box(4, 9, -3, 3, top, top + 0.8, 0.3, 9)],
      },
    ],
    {
      in: spot([3.8, plate.v + 0.4, Z + 10.4], [0.15, 1, -0.3]),
      power: spot([9.4, plate.v + 0.4, Z + 4.6], [0.3, 1, -0.3]),
    },
    {
      scale: 0.82,
      movers: [{ type: 'pump', part: 'cone', axis: FORWARD, reach: 0.9 }],
    },
  );
}

export function wedgeVisual(): GearVisual {
  // Side on, in (u, z): the low nose toward the viewer, the slope facing up
  // and forward at the performer.
  const W = 10;
  const slope = { a: [0, 4] as const, b: [15, 14] as const };
  const AXIS: V3 = [-0.55, 0, 0.83];
  const c = 0.5;
  const onSlope = (t: number, v: number, lift = 0): V3 => [
    slope.a[0] + (slope.b[0] - slope.a[0]) * t + AXIS[0] * lift,
    v,
    slope.a[1] + (slope.b[1] - slope.a[1]) * t + AXIS[2] * lift,
  ];
  const speaker = woofer(...onSlope(c, 0), 6.6, AXIS);
  return visual(
    [
      {
        id: 'cabinet',
        solids: [
          {
            outer: [
              [0, 0],
              [19, 0],
              [19, 14],
              [15, 14],
              [0, 4],
            ],
            z0: -W,
            z1: W,
            plane: 'side',
            hatchGap: 1.1,
          },
        ],
      },
      {
        id: 'baffle',
        solids: [
          polyFace([
            onSlope(0.04, -W + 0.8, 0.02),
            onSlope(0.04, W - 0.8, 0.02),
            onSlope(0.96, W - 0.8, 0.02),
            onSlope(0.96, -W + 0.8, 0.02),
          ]),
        ],
      },
      { id: 'surround', solids: [speaker.ring] },
      { id: 'cone', solids: [speaker.cone, speaker.cap], stacked: true },
      {
        id: 'jacks',
        solids: [
          sideFace(W + 0.02, 8.5, 17.5, 1.4, 8.6),
          jackCollar([12, W, 5], [0, 1, 0], 0.72),
          jackCollar([15.6, W, 3], [0, 1, 0], 0.5),
        ],
        stacked: true,
      },
    ],
    {
      in: spot([12, W + 0.4, 5], [0.15, 1, -0.3]),
      power: spot([15.6, W + 0.4, 3], [0.3, 1, -0.3]),
    },
    {
      scale: 0.82,
      movers: [{ type: 'pump', part: 'cone', axis: AXIS, reach: 0.8 }],
    },
  );
}

export function monitorVisual(): GearVisual {
  const W = 4.2;
  const D = 10;
  const H = 13;
  const speaker = woofer(0, 0, 4.8, 3.3);
  return visual(
    [
      {
        id: 'cabinet',
        solids: [
          {
            outer: roundedRect(0, H / 2, W, H / 2, 0.6),
            z0: 0,
            z1: D,
            plane: 'front',
            hatchGap: 0.7,
          },
        ],
      },
      { id: 'surround', solids: [speaker.ring] },
      { id: 'cone', solids: [speaker.cone, speaker.cap], stacked: true },
      {
        id: 'tweeter',
        solids: [
          lathe({
            origin: [0, 0, 10.6],
            axis: FORWARD,
            profile: [
              [0, 1.4],
              [0.08, 1.4, 'seam'],
              [0.1, 0.9],
              [0.2, 0.5],
              [0.3, 0.01],
            ],
          }),
        ],
        marks: [frontRing(-0.02, 0, 10.6, 0.7)],
      },
      {
        id: 'jacks',
        solids: [
          sideFace(W + 0.02, 3, 8.8, 1.4, 6.2),
          jackCollar([5.8, W, 4], [0, 1, 0], 0.62),
        ],
        stacked: true,
      },
    ],
    {
      in: spot([5.8, W + 0.4, 4], [0.15, 1, -0.3]),
      power: spot([5.8, W + 0.1, 2], [0.3, 1, -0.3]),
    },
    {
      scale: 1.05,
      movers: [{ type: 'pump', part: 'cone', axis: FORWARD, reach: 0.4 }],
    },
  );
}
