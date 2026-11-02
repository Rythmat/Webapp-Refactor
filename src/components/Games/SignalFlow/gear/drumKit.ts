import { lathe, type Solid, type V3 } from '@/curriculum/anatomy/iso';
import {
  spot,
  topRing,
  visual,
  type GearVisual,
  type PartSpec,
} from './shapes';

// ── A five-piece drum kit, with its mics ───────────────────────────────────
// In real inches: 22" kick, 14" snare, 12" rack tom, 16" floor tom. It spreads
// out along the viewer's diagonal so nothing hides anything: the floor tom and
// ride far (−v), the kick in the middle with its head turned to the viewer, the
// snare and hi-hat near (+v). Each voice carries the mic its cable plugs into.

const UP: V3 = [0, 0, 1];
const FORWARD: V3 = [-1, 0, 0];

const LUGS = 7;

/** A drum on its side or upright: shell, two hoops, and the tension rods along
 *  the half that faces the viewer. */
function drum(
  origin: V3,
  axis: V3,
  depth: number,
  r: number,
): { solids: Solid[]; marks: V3[][] } {
  const hoop = r * 1.045;
  const shell = lathe({
    origin,
    axis,
    profile: [
      [0, hoop],
      [r * 0.09, hoop, 'seam'],
      [r * 0.11, r],
      [depth - r * 0.11, r, 'seam'],
      [depth - r * 0.09, hoop, 'seam'],
      [depth, hoop],
    ],
  });
  // Around the axis: `a` and `b` are the two directions across the drum.
  const up = axis[2] !== 0;
  const a: V3 = up ? [1, 0, 0] : [0, 1, 0];
  const b: V3 = up ? [0, 1, 0] : [0, 0, 1];
  const at = (t: number, angle: number): V3 => {
    const c = Math.cos(angle) * r;
    const s = Math.sin(angle) * r;
    return [
      origin[0] + axis[0] * t + a[0] * c + b[0] * s,
      origin[1] + axis[1] * t + a[1] * c + b[1] * s,
      origin[2] + axis[2] * t + a[2] * c + b[2] * s,
    ];
  };
  const marks: V3[][] = [];
  for (let i = 0; i < LUGS * 2; i++) {
    const angle = (i / (LUGS * 2)) * Math.PI * 2;
    const side = at(0, angle);
    // Only the side of the shell that faces the viewer.
    const facing =
      -(side[0] - origin[0]) + (side[1] - origin[1]) + (side[2] - origin[2]);
    if (facing < r * 0.25) continue;
    marks.push([at(r * 0.12, angle), at(depth - r * 0.12, angle)]);
  }
  return { solids: [shell], marks };
}

/** A cymbal: its bow, its bell, and the lathe's grooves. */
function cymbal(origin: V3, r: number): { solid: Solid; marks: V3[][] } {
  const [u, v, z] = origin;
  return {
    solid: lathe({
      origin,
      axis: UP,
      profile: [
        [0, r],
        [r * 0.05, r * 0.5],
        [r * 0.08, r * 0.2, 'seam'],
        [r * 0.13, r * 0.15],
        [r * 0.15, 0.01],
      ],
    }),
    marks: [
      topRing(u, v, z + r * 0.022, r * 0.78, 36),
      topRing(u, v, z + r * 0.04, r * 0.58, 30),
    ],
  };
}

/** A stand: a post and its three legs. */
const stand = (u: number, v: number, top: number, spread = 5): V3[][] => [
  [
    [u, v, 0],
    [u, v, top],
  ],
  [
    [u, v, spread * 1.1],
    [u - spread, v, 0],
  ],
  [
    [u, v, spread * 1.1],
    [u + spread * 0.5, v + spread * 0.86, 0],
  ],
  [
    [u, v, spread * 1.1],
    [u + spread * 0.5, v - spread * 0.86, 0],
  ],
];

/** A small mic clipped to a rim, leaning in over the head. */
const clipMic = (at: V3): Solid =>
  lathe({
    origin: at,
    axis: [0.3, -0.1, 0.95],
    profile: [
      [0, 0.42],
      [2.2, 0.42, 'seam'],
      [2.6, 0.58],
      [3.3, 0.38],
    ],
  });

export function drumKitVisual(): GearVisual {
  const KICK_R = 11;
  const KICK_DEPTH = 16;
  const kickFront = 0;
  const kickZ = KICK_R + 0.6;

  const kick = drum(
    [KICK_DEPTH + kickFront, 0, kickZ],
    FORWARD,
    KICK_DEPTH,
    KICK_R,
  );
  const rackTom = drum([8, -1, kickZ + KICK_R + 2.5], UP, 8.5, 6);
  const floor = drum([4, -29, 4.5], UP, 15, 8);
  const snare = drum([4, 19, 20], UP, 5.5, 7);

  const ride = cymbal([16, -22, 40], 10);
  const hat: V3 = [2, 34, 33];
  const hatLower = cymbal([hat[0], hat[1], hat[2] - 0.5], 7);
  const hatUpper = cymbal([hat[0], hat[1], hat[2] + 0.5], 7);

  const kickMicBase: V3 = [kickFront - 7, -5, 0];
  const overheadMic: V3 = [10, 9, 45];
  const rackRim: V3 = [8 - 5, -1 + 3, kickZ + KICK_R + 11];
  const snareRim: V3 = [4 - 6.1, 19 + 2.2, 25.8];
  const hatRim: V3 = [hat[0] - 6, hat[1] + 1.5, hat[2] + 1.2];

  const parts: PartSpec[] = [
    {
      id: 'ride',
      solids: [ride.solid],
      marks: [...ride.marks, ...stand(16, -22, 40)],
    },
    {
      id: 'floorTom',
      solids: floor.solids,
      marks: [
        ...floor.marks,
        // Its three legs.
        [
          [-3, -33, 0],
          [-3, -33, 6],
        ],
        [
          [7, -22, 0],
          [7, -22, 6],
        ],
        [
          [10, -35, 0],
          [10, -35, 6],
        ],
        topRing(4, -29, 19.5, 6.2, 28),
      ],
    },
    {
      id: 'kick',
      solids: kick.solids,
      marks: [
        ...kick.marks,
        // The front head's port, where the kick mic looks in.
        ...(() => {
          const ring: V3[] = [];
          for (let i = 0; i <= 24; i++) {
            const a = (i / 24) * Math.PI * 2;
            ring.push([
              kickFront - 0.02,
              -5 + Math.cos(a) * 2.6,
              kickZ - 3.6 + Math.sin(a) * 2.6,
            ]);
          }
          return [ring];
        })(),
        // Its spurs.
        [
          [5, 8, 3],
          [1, 13, 0],
        ],
        [
          [5, -8, 3],
          [1, -13, 0],
        ],
      ],
    },
    {
      id: 'rackTom',
      stacked: true,
      solids: [...rackTom.solids, clipMic(rackRim)],
      marks: [
        ...rackTom.marks,
        topRing(8, -1, kickZ + KICK_R + 11, 4.6, 24),
        // Its mount on the kick.
        [
          [8, -1, kickZ + KICK_R - 0.4],
          [8, -1, kickZ + KICK_R + 2.5],
        ],
      ],
    },
    {
      id: 'kickMic',
      solids: [
        lathe({
          origin: [kickMicBase[0], kickMicBase[1], 5],
          axis: [0.86, 0, 0.5],
          profile: [
            [0, 0.62],
            [3, 0.62, 'seam'],
            [3.5, 0.95],
            [5, 0.8],
          ],
        }),
      ],
      marks: stand(kickMicBase[0], kickMicBase[1], 5, 3),
    },
    {
      id: 'snare',
      stacked: true,
      solids: [...snare.solids, clipMic(snareRim)],
      marks: [
        ...snare.marks,
        ...stand(4, 19, 20, 6),
        topRing(4, 19, 25.5, 5.6, 26),
      ],
    },
    {
      id: 'hat',
      stacked: true,
      solids: [hatLower.solid, hatUpper.solid, clipMic(hatRim)],
      marks: [...hatUpper.marks, ...stand(hat[0], hat[1], hat[2] + 3, 5)],
    },
    {
      id: 'overhead',
      solids: [
        lathe({
          origin: overheadMic,
          axis: [0.1, 0, -1],
          profile: [
            [0, 0.45],
            [2.8, 0.45, 'seam'],
            [3.4, 0.62],
            [4.2, 0.42],
          ],
        }),
      ],
      marks: [[[10, 24, 45], overheadMic], ...stand(10, 24, 45, 6)],
    },
  ];

  return visual(
    parts,
    {
      kick: spot([kickMicBase[0], kickMicBase[1], 5], [-0.5, 0.5, -0.5]),
      snare: spot(snareRim, [-0.7, 0.5, -0.4]),
      hat: spot(hatRim, [-0.3, 0.8, -0.4]),
      tom: spot(rackRim, [-0.8, 0.3, -0.3]),
      overhead: spot(overheadMic, [-0.5, 0.7, 0.1]),
    },
    { scale: 0.88 },
  );
}
