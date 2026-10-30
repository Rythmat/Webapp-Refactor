import type { InstrumentModel, PartDef, TermDef } from './anatomyTypes';
import {
  circle,
  clover,
  hatchInside,
  mirrorHalf,
  ringMarks,
  roundedRect,
  sampleOutline,
  scaleAbout,
  strip,
  type Solid,
  type V2,
  type V3,
} from './iso';
import {
  boardTop,
  edgeAt,
  fretDistance,
  NECK_PART_IDS,
  neckParts,
  neckTerms,
  type NeckSpec,
} from './neckGeometry';

// ── The acoustic instruments ───────────────────────────────────────────────
// A steel-string flat top, built the way a luthier builds one: a back, a rim of
// sides, a thin top braced from underneath, with the neck joining the body. The
// outlines are drawn for a 20" body and scaled, so the guitar and the bass are
// one build with their own proportions, in inches, the butt at u = 0.

interface AcousticSpec {
  kind: InstrumentModel['kind'];
  label: string;
  noun: string;
  scale: number;
  /** The fret where the neck meets the body. */
  joinFret: number;
  fretCount: number;
  bodyLength: number;
  /** Across the body, against the drawn outline. */
  widthScale: number;
  depth: number;
  holeU: number;
  holeR: number;
  halfNut: number;
  halfEnd: number;
  headLength: number;
  /** A head's half width at its widest. */
  headHalf: number;
  /** Each side's posts, as distances from the nut. */
  posts: readonly number[];
  postRadius: number;
  /** A tuner's button, half its length and half its width. */
  button: readonly [number, number];
  /** Where the strings cross, out from the centre: nut, saddle, pins. */
  nutSpread: number;
  saddleSpread: number;
  pinSpread: number;
  pinRadius: number;
  stringWeight: number;
  /** A bass's large three-lobed tuner keys. */
  cloverKeys: boolean;
  /** Name the gaps between the frets too. */
  fretSpaces: boolean;
  /** A bass is quiet unplugged, so it carries a pickup and a jack. */
  electronics: boolean;
}

export function acousticModel(spec: AcousticSpec): InstrumentModel {
  const SCALE = spec.scale;
  const BODY_LENGTH = spec.bodyLength;
  const NUT_U = BODY_LENGTH + fretDistance(spec.joinFret, SCALE);
  const BRIDGE_U = NUT_U - SCALE;
  const ku = BODY_LENGTH / 20;
  const kv = spec.widthScale;
  /** A point of the drawn 20" body, on this body. */
  const at = (u: number, v: number): V2 => [u * ku, v * kv];

  const BACK_TOP = 0.12;
  const RIM_TOP = spec.depth - 0.12;
  const TOP_FACE = spec.depth;

  const OUTLINE = mirrorHalf(
    sampleOutline(`
      M 0 0
      C 0 4.0, 1.1 7.1, 4.6 7.8
      C 7.6 8.4, 9.9 6.5, 11.6 5.3
      C 12.6 4.7, 13.4 5.0, 14.4 5.5
      C 16.0 6.2, 17.9 6.0, 19.0 4.1
      C 19.7 2.9, 20 1.6, 20 0
    `),
  ).map(([u, v]) => at(u, v));
  const RIM_INNER = scaleAbout(OUTLINE, 9.8 * ku, 0, 0.975, 0.97);

  const HOLE_U = spec.holeU;
  const HOLE_R = spec.holeR;
  const SOUND_HOLE = circle(HOLE_U, 0, HOLE_R, 40);
  const ROSETTE_OUTER = circle(HOLE_U, 0, HOLE_R + 0.5, 40);
  const ROSETTE_INNER = circle(HOLE_U, 0, HOLE_R + 0.06, 40);

  // Drawn around a 2" sound hole at u = 13.45; it follows this one.
  const guardKeep = HOLE_R / 2;
  const GUARD = sampleOutline(`
    M 15.0 1.75
    C 14.9 3.0, 14.5 4.2, 13.6 4.8
    C 12.4 5.55, 10.3 5.2, 9.9 4.2
    C 9.6 3.4, 10.3 2.45, 11.2 1.75
    C 11.55 2.2, 12.1 2.65, 12.8 2.8
    C 13.8 2.95, 14.6 2.5, 15.0 1.75
    Z
  `).map(([u, v]): V2 => [HOLE_U + (u - 13.45) * guardKeep, v * guardKeep]);

  const BRIDGE_OUTLINE = sampleOutline(`
    M ${BRIDGE_U + 0.5} -1.75
    C ${BRIDGE_U + 0.48} -2.3, ${BRIDGE_U + 0.42} -2.8, ${BRIDGE_U + 0.28} -3.1
    L ${BRIDGE_U - 0.5} -3.1
    C ${BRIDGE_U - 0.62} -2.5, ${BRIDGE_U - 0.92} -2.0, ${BRIDGE_U - 1.0} -1.5
    C ${BRIDGE_U - 1.1} -0.5, ${BRIDGE_U - 1.1} 0.5, ${BRIDGE_U - 1.0} 1.5
    C ${BRIDGE_U - 0.92} 2.0, ${BRIDGE_U - 0.62} 2.5, ${BRIDGE_U - 0.5} 3.1
    L ${BRIDGE_U + 0.28} 3.1
    C ${BRIDGE_U + 0.42} 2.8, ${BRIDGE_U + 0.48} 2.3, ${BRIDGE_U + 0.5} 1.75
    Z
  `);

  const BRIDGE_TOP = TOP_FACE + 0.3;
  const PIN_U = BRIDGE_U - 0.55;
  const stringCount = spec.posts.length * 2;
  /** −1 at the bass-side string, +1 at the treble-side one. */
  const across = Array.from(
    { length: stringCount },
    (_, i) => (i - (stringCount - 1) / 2) / ((stringCount - 1) / 2),
  );
  const PIN_V = across.map((k) => k * spec.pinSpread);

  const neckSpec: NeckSpec = {
    nutU: NUT_U,
    scale: SCALE,
    fretCount: spec.fretCount,
    boardEndU: NUT_U - fretDistance(spec.fretCount, SCALE) - 0.15,
    heelU: BODY_LENGTH - 2.1,
    halfNut: spec.halfNut,
    halfEnd: spec.halfEnd,
    z0: TOP_FACE - 0.5,
    z1: TOP_FACE + 0.1,
    explode: [5.6, 0, 2.2],
  };
  const NECK_TOP = neckSpec.z1;
  const BOARD_TOP = boardTop(neckSpec);

  const HEAD_LENGTH = spec.headLength;
  const HEAD = mirrorHalf(
    sampleOutline(`
      M ${NUT_U} ${spec.halfNut}
      C ${NUT_U + 0.6} ${spec.halfNut + 0.1}, ${NUT_U + 1.1} ${spec.headHalf - 0.15}, ${NUT_U + 1.7} ${spec.headHalf - 0.1}
      C ${NUT_U + HEAD_LENGTH * 0.45} ${spec.headHalf}, ${NUT_U + HEAD_LENGTH * 0.7} ${spec.headHalf}, ${NUT_U + HEAD_LENGTH * 0.89} ${spec.headHalf - 0.3}
      C ${NUT_U + HEAD_LENGTH * 0.96} ${spec.headHalf - 0.75}, ${NUT_U + HEAD_LENGTH * 0.99} ${spec.headHalf - 1.2}, ${NUT_U + HEAD_LENGTH} 0
    `),
  ).concat([[NUT_U, -spec.halfNut] as V2]);

  /** The bass side's posts, then the treble side's. */
  const POSTS: readonly V2[] = [-1, 1].flatMap((side) =>
    spec.posts.map((d): V2 => [NUT_U + d, side * (spec.headHalf - 0.63)]),
  );

  const tunerSolids = (): Solid[] =>
    POSTS.flatMap(([u, v]): Solid[] => {
      const side = v < 0 ? 'bass' : 'treble';
      const edge = edgeAt(HEAD, u, side);
      const out = v < 0 ? -1 : 1;
      const [buttonU, buttonV] = spec.button;
      return [
        {
          outer: circle(u, v, spec.postRadius + 0.09, 12),
          z0: NECK_TOP,
          z1: NECK_TOP + 0.06,
          hatch: false,
        },
        {
          outer: circle(u, v, spec.postRadius, 10),
          z0: NECK_TOP + 0.06,
          z1: NECK_TOP + 0.6,
          hatch: false,
        },
        {
          outer: strip([u, edge - out * 0.12], [u, edge + out * 0.34], 0.1),
          z0: NECK_TOP - 0.3,
          z1: NECK_TOP - 0.2,
          hatch: false,
        },
        {
          outer: spec.cloverKeys
            ? clover(u, edge + out * 0.82, 0.58).map(
                ([cu, cv]): V2 => [
                  cu,
                  edge + out * 0.82 + (cv - (edge + out * 0.82)) * -out,
                ],
              )
            : roundedRect(
                u,
                edge + out * (0.36 + buttonV),
                buttonU,
                buttonV,
                buttonV * 0.9,
              ),
          z0: NECK_TOP - 0.38,
          z1: NECK_TOP - 0.12,
          hatch: false,
        },
      ];
    });

  /** From each pin over the saddle to the nut and on to its post. Each side's
   *  outermost string goes to its side's furthest post. */
  const stringLines = (): V3[][] => {
    const perSide = spec.posts.length;
    return across.map((k, i): V3[] => {
      const post = POSTS[i < perSide ? perSide - 1 - i : i];
      return [
        [PIN_U, PIN_V[i], BRIDGE_TOP + 0.02],
        [BRIDGE_U, k * spec.saddleSpread, BRIDGE_TOP + 0.2],
        [NUT_U, k * spec.nutSpread, BOARD_TOP + 0.12],
        [post[0], post[1], NECK_TOP + 0.5],
      ];
    });
  };

  const BRACES: readonly (readonly [V2, V2, number])[] = [
    [at(16.2, -3.8), at(3.2, 6.8), 0.34],
    [at(16.2, 3.8), at(3.2, -6.8), 0.34],
    [at(16.8, -5.3), at(16.8, 5.3), 0.42],
    [at(8.0, 2.8), at(3.3, 3.6), 0.22],
    [at(8.0, -2.8), at(3.3, -3.6), 0.22],
  ];
  const BRIDGE_PLATE = roundedRect(BRIDGE_U + 0.25, 0, 1.0, 2.5, 0.1);

  const SADDLE_HALF = 1.45;
  const electronicsParts: PartDef[] = spec.electronics
    ? [
        {
          // Under the saddle: the saddle presses on it with every note.
          id: 'piezo',
          solids: [
            {
              outer: strip(
                [BRIDGE_U + 0.08, -SADDLE_HALF + 0.1],
                [BRIDGE_U - 0.08, SADDLE_HALF - 0.1],
                0.07,
              ),
              z0: BRIDGE_TOP - 0.02,
              z1: BRIDGE_TOP + 0.03,
              hatch: false,
            },
          ],
          explode: [-2.6, 0, 5],
          hitPad: 0.2,
        },
        {
          // In the end of the body, where a strap button would be.
          id: 'outputJack',
          solids: [
            {
              outer: roundedRect(-0.05, 0, 0.09, 0.44, 0.04),
              z0: spec.depth * 0.5 - 0.44,
              z1: spec.depth * 0.5 + 0.44,
              hatch: false,
            },
          ],
          marks: [
            circle(0, 0, 0.22, 14).map(
              ([a, b]): V3 => [-0.14, a, spec.depth * 0.5 + b],
            ),
          ],
          explode: [-2.4, 0, 0],
          hitPad: 0.3,
        },
      ]
    : [];

  const parts: PartDef[] = [
    {
      id: 'back',
      solids: [{ outer: OUTLINE, z0: 0, z1: BACK_TOP, hatch: false }],
      features: { grain: hatchInside(OUTLINE, [], BACK_TOP, 0.8, 0.05) },
      marks: [
        [
          [1.2 * ku, 0, BACK_TOP],
          [18.8 * ku, 0, BACK_TOP],
        ],
      ],
      explode: [0, 0, -2.6],
    },
    {
      id: 'sides',
      solids: [
        { outer: OUTLINE, holes: [RIM_INNER], z0: BACK_TOP, z1: RIM_TOP },
      ],
      explode: [0, 0, 0],
    },
    ...(spec.electronics
      ? electronicsParts.filter((p) => p.id === 'outputJack')
      : []),
    {
      id: 'bracing',
      solids: [
        ...BRACES.map(([a, b, width]) => ({
          outer: strip(a, b, width),
          z0: RIM_TOP - 0.3,
          z1: RIM_TOP,
          hatch: false,
        })),
        { outer: BRIDGE_PLATE, z0: RIM_TOP - 0.08, z1: RIM_TOP, hatch: false },
      ],
      explode: [0, 0, 1.7],
    },
    {
      id: 'top',
      solids: [
        {
          outer: OUTLINE,
          holes: [SOUND_HOLE],
          z0: RIM_TOP,
          z1: TOP_FACE,
          hatch: false,
        },
      ],
      features: {
        soundHole: [
          ringMarks(HOLE_U, 0, HOLE_R, TOP_FACE, 40),
          ringMarks(HOLE_U, 0, HOLE_R - 0.04, TOP_FACE, 40),
        ],
        grain: hatchInside(OUTLINE, [SOUND_HOLE], TOP_FACE, 0.8, 0.015),
      },
      explode: [0, 0, 3.5],
    },
    {
      id: 'rosette',
      solids: [
        {
          outer: ROSETTE_OUTER,
          holes: [ROSETTE_INNER],
          z0: TOP_FACE,
          z1: TOP_FACE + 0.02,
          hatch: false,
        },
      ],
      marks: [ringMarks(HOLE_U, 0, HOLE_R + 0.3, TOP_FACE + 0.02, 40)],
      explode: [0, -1.6, 5.4],
      hitPad: 0.1,
    },
    {
      id: 'pickguard',
      solids: [
        { outer: GUARD, z0: TOP_FACE, z1: TOP_FACE + 0.03, hatch: false },
      ],
      marks: hatchInside(GUARD, [], TOP_FACE + 0.03, 0.36, 0.58),
      explode: [0, 2.4, 4.4],
    },
    {
      id: 'bridge',
      solids: [
        { outer: BRIDGE_OUTLINE, z0: TOP_FACE, z1: BRIDGE_TOP, hatch: false },
      ],
      explode: [-2.6, 0, 4.2],
    },
    ...electronicsParts.filter((p) => p.id === 'piezo'),
    {
      id: 'saddle',
      solids: [
        {
          outer: strip(
            [BRIDGE_U + 0.08, -SADDLE_HALF],
            [BRIDGE_U - 0.08, SADDLE_HALF],
            0.11,
          ),
          z0: BRIDGE_TOP,
          z1: BRIDGE_TOP + 0.15,
          hatch: false,
        },
      ],
      explode: [-2.6, 0, 5.8],
      hitPad: 0.2,
    },
    {
      id: 'bridgePins',
      solids: PIN_V.flatMap((v): Solid[] => [
        {
          outer: circle(PIN_U, v, spec.pinRadius, 10),
          z0: BRIDGE_TOP,
          z1: BRIDGE_TOP + 0.14,
          hatch: false,
        },
      ]),
      marks: PIN_V.map((v) =>
        ringMarks(PIN_U, v, spec.pinRadius * 0.42, BRIDGE_TOP + 0.14, 8),
      ),
      explode: [-2.6, 0, 6.6],
      hitPad: 0.18,
    },
    {
      id: 'headstock',
      solids: [{ outer: HEAD, z0: NECK_TOP - 0.55, z1: NECK_TOP }],
      marks: [
        // The truss rod's cover, as in the reference drawing.
        [
          [NUT_U + 0.25, -0.22, NECK_TOP],
          [NUT_U + 2.2, -0.08, NECK_TOP],
          [NUT_U + 2.2, 0.08, NECK_TOP],
          [NUT_U + 0.25, 0.22, NECK_TOP],
          [NUT_U + 0.25, -0.22, NECK_TOP],
        ],
      ],
      explode: neckSpec.explode,
    },
    ...neckParts(neckSpec),
    {
      id: 'tuners',
      solids: tunerSolids(),
      explode: [5.6, 0, 4.2],
      hitPad: 0.08,
    },
    {
      id: 'strings',
      solids: [],
      marks: stringLines(),
      explode: [1.6, -2.6, 8.4],
      hitPad: 0.12,
      lineWeight: spec.stringWeight,
    },
  ];

  const NECK_GROUP = [...NECK_PART_IDS, 'headstock', 'tuners'];
  const SLID_OUT: V3 = [6.2, 0, 1.6];
  const slideNeck = () =>
    Object.fromEntries(NECK_GROUP.map((id): [string, V3] => [id, SLID_OUT]));
  const allBut = (keep: readonly string[], offset: V3) =>
    Object.fromEntries(
      parts
        .filter((p) => !keep.includes(p.id))
        .map((p): [string, V3] => [p.id, offset]),
    );
  const OVER_TOP = [
    'rosette',
    'pickguard',
    'bridge',
    'saddle',
    'bridgePins',
    ...(spec.electronics ? ['piezo'] : []),
  ];
  const lifted = (ids: readonly string[], offset: V3) =>
    Object.fromEntries(ids.map((id): [string, V3] => [id, offset]));

  const terms: TermDef[] = [
    ...neckTerms({
      group: NECK_GROUP,
      anchor: [BODY_LENGTH + 6, 0, NECK_TOP],
      lift: [4.5, 0, 1.4],
      follow: ['tuners'],
      fretSpaces: spec.fretSpaces,
    }),
    // Body
    {
      id: 'body',
      name: 'Body',
      family: 'body',
      parts: ['back', 'sides', 'top'],
      lift: [0, 0, 0],
      reveal: {
        ...allBut(['back', 'sides', 'top'], [0, 0, 3.4]),
        ...slideNeck(),
      },
    },
    {
      id: 'top',
      name: 'Top',
      family: 'body',
      parts: ['top'],
      lift: [0, 0, 3],
      reveal: lifted(OVER_TOP, [0, 0, 3]),
    },
    {
      id: 'soundHole',
      name: 'Sound Hole',
      family: 'body',
      parts: ['top'],
      feature: 'soundHole',
      lift: [0, 0, 1.6],
      reveal: lifted(OVER_TOP, [0, 0, 1.6]),
      anchor: [HOLE_U, HOLE_R, TOP_FACE],
    },
    {
      id: 'rosette',
      name: 'Rosette',
      family: 'body',
      parts: ['rosette'],
      lift: [0, 0, 2.2],
      anchor: [HOLE_U, HOLE_R + 0.3, TOP_FACE],
    },
    {
      id: 'pickguard',
      name: 'Pickguard',
      family: 'body',
      parts: ['pickguard'],
      lift: [0, 0, 2.2],
    },
    {
      id: 'bracing',
      name: 'Bracing',
      family: 'body',
      parts: ['bracing'],
      lift: [0, 0, 0],
      seeThrough: ['top', ...OVER_TOP, ...NECK_GROUP],
      anchor: [5.5 * ku, 4.4 * kv, RIM_TOP],
    },
    {
      id: 'backSides',
      name: 'Back & Sides',
      family: 'body',
      parts: ['back', 'sides'],
      lift: [0, 0, 0],
      reveal: {
        back: [0, 0, -2.2],
        ...allBut(['back', 'sides'], [0, 0, 3.4]),
        ...slideNeck(),
      },
    },
    {
      id: 'tonewood',
      name: 'Tonewood',
      family: 'body',
      parts: ['back', 'top'],
      feature: 'grain',
      lift: [0, 0, 0],
      reveal: {
        back: [0, 0, -2.2],
        top: [0, 0, 3.2],
        bracing: [0, 0, 1.6],
        ...lifted(OVER_TOP, [0, 0, 4.2]),
        ...slideNeck(),
      },
      anchor: [6, 3, TOP_FACE],
    },
    // Hardware
    {
      id: 'bridge',
      name: 'Bridge',
      family: 'hardware',
      parts: ['bridge', 'saddle', 'bridgePins'],
      lift: [0, 0, 2.2],
      reveal: spec.electronics ? { piezo: [0, 0, 2.2] } : undefined,
    },
    {
      id: 'saddle',
      name: 'Saddle',
      family: 'hardware',
      parts: ['saddle'],
      lift: [0, 0, 2.2],
      reveal: {
        bridge: [0, 0, 0.9],
        bridgePins: [0, 0, 0.9],
        ...(spec.electronics ? { piezo: [0, 0, 0.9] as V3 } : {}),
      },
    },
    {
      id: 'bridgePins',
      name: 'Bridge Pins',
      family: 'hardware',
      parts: ['bridgePins'],
      lift: [0, 0, 2],
    },
    {
      id: 'strings',
      name: 'Strings',
      family: 'hardware',
      parts: ['strings'],
      lift: [0, 0, 3],
    },
    ...(spec.electronics
      ? ([
          {
            id: 'piezo',
            name: 'Under-Saddle Pickup',
            family: 'electronics',
            parts: ['piezo'],
            lift: [0, 0, 1.3],
            reveal: { saddle: [0, 0, 2.6] },
          },
          {
            id: 'outputJack',
            name: 'Output Jack',
            family: 'electronics',
            parts: ['outputJack'],
            lift: [-2, 0, 0],
          },
        ] satisfies TermDef[])
      : []),
  ];

  return {
    kind: spec.kind,
    label: spec.label,
    noun: spec.noun,
    accentKey: 'G',
    parts,
    terms,
    buildOrder: [
      { term: 'backSides', name: 'Back', parts: ['back'] },
      { term: 'backSides', name: 'Sides', parts: ['sides'] },
      ...(spec.electronics
        ? [{ term: 'outputJack', parts: ['outputJack'] }]
        : []),
      { term: 'bracing', parts: ['bracing'] },
      { term: 'top', parts: ['top'] },
      { term: 'rosette', parts: ['rosette'] },
      { term: 'pickguard', parts: ['pickguard'] },
      { term: 'bridge', parts: ['bridge'] },
      ...(spec.electronics ? [{ term: 'piezo', parts: ['piezo'] }] : []),
      { term: 'saddle', parts: ['saddle'] },
      { term: 'neck', parts: ['neckShaft'] },
      { term: 'headstock', parts: ['headstock'] },
      { term: 'trussRod', parts: ['trussRod'] },
      { term: 'fretboard', parts: ['fretboard'] },
      { term: 'fretMarkers', parts: ['markers'] },
      { term: 'frets', parts: ['frets'] },
      { term: 'nut', parts: ['nut'] },
      { term: 'tuningPegs', parts: ['tuners'] },
      { term: 'strings', parts: ['strings'] },
      { term: 'bridgePins', parts: ['bridgePins'] },
    ],
  };
}

/** 25.5" scale, 20" body, 4" deep, six strings on a three-a-side head. */
export const ACOUSTIC_MODEL = acousticModel({
  kind: 'acoustic',
  label: 'Acoustic',
  noun: 'guitar',
  scale: 25.5,
  joinFret: 14,
  fretCount: 20,
  bodyLength: 20,
  widthScale: 1,
  depth: 4,
  holeU: 13.45,
  holeR: 2,
  halfNut: 0.85,
  halfEnd: 1.13,
  headLength: 7.05,
  headHalf: 1.65,
  posts: [1.55, 3.05, 4.55],
  postRadius: 0.11,
  button: [0.33, 0.2],
  nutSpread: 0.7,
  saddleSpread: 1.1,
  pinSpread: 1.1,
  pinRadius: 0.12,
  stringWeight: 1,
  cloverKeys: false,
  fretSpaces: false,
  electronics: false,
});

/** 34" scale, a 21" jumbo body, 5" deep, four strings on a two-a-side head. */
export const ACOUSTIC_BASS_MODEL = acousticModel({
  kind: 'acousticBass',
  label: 'Acoustic',
  noun: 'bass',
  scale: 34,
  joinFret: 15,
  fretCount: 20,
  bodyLength: 21,
  widthScale: 1.08,
  depth: 5,
  holeU: 14.4,
  holeR: 2.1,
  halfNut: 0.82,
  halfEnd: 1.2,
  headLength: 7.4,
  headHalf: 1.72,
  posts: [2.1, 4.6],
  postRadius: 0.16,
  button: [0.42, 0.3],
  nutSpread: 0.58,
  saddleSpread: 1.05,
  pinSpread: 0.95,
  pinRadius: 0.15,
  stringWeight: 2.2,
  cloverKeys: true,
  fretSpaces: true,
  electronics: true,
});
