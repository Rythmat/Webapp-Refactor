#!/usr/bin/env node
/* eslint-env node */
/**
 * Build the hands Learn draws over the keyboard from Peter's drawings, one
 * per hand shape (Piano_Hand_Overlays/svg, traced line art):
 *
 *   node scripts/fingering/buildHandPoses.mjs ~/Downloads/Piano_Hand_Overlays/svg
 *
 * Each drawing is a hand seen as the player sees their own: a left hand with
 * its little finger on the left, a right hand with its thumb on the left, the
 * fingers that play reaching up into the keys and the rest curled. CATALOG
 * says which hand each is, which fingers play in it, and roughly where each
 * fingertip is. From the drawing this works out
 *
 *   - paper:  the hand's silhouette, filled under the lines so a lit key
 *     never shows through it;
 *   - each playing finger's tip (the middle of its pad, where it meets the
 *     key), its wash (the finger's inside, painted in the key color when it
 *     plays) and its root, down the finger, where the wash fades out;
 *   - scale: the drawings come at all sizes, so each is measured by its own
 *     fingers' width and set to KEY units a white key, the five-finger
 *     drawings' fingertips one key apart.
 *
 * Writes src/learn/fingering/handPoseArt.ts. Commit it. `--json <file>` also
 * writes the result as JSON, for review sheets.
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';

const args = process.argv.slice(2);
const jsonAt = args.indexOf('--json');
const jsonOut = jsonAt >= 0 ? args.splice(jsonAt, 2)[1] : null;
const dir = args[0]?.replace(/^~/, homedir());
if (!dir) {
  console.error(
    'usage: node scripts/fingering/buildHandPoses.mjs <drawings dir> [--json out.json]',
  );
  process.exit(1);
}
const OUT = new URL(
  '../../src/learn/fingering/handPoseArt.ts',
  import.meta.url,
);

/** Units to a white key in the output. */
const KEY = 100;
/** Pixels on a drawing's long side when it is measured. */
const RASTER = 800;

/**
 * Peter's drawings. `plays`: the fingers on or over keys (the rest are
 * curled up); `uses`: the sets of them that play together, when not all
 * (a drawing can serve two shapes, the fingers it doesn't use hovering);
 * `tips`: near each fingertip, in the drawing's own units (the farthest point
 * of the finger from the palm); `neutral`: a relaxed five-finger hand, the
 * one to show when no shape fits better; `span: [a, b, keys]`: fingers a
 * and b reach this many white keys apart (an octave's 7), so the drawing is
 * sized up toward it; `scale`: a size correction, and `wash`: how many
 * fingers' width down a wash reaches at least, where a web beside a lowered
 * finger sits high. A drawing named for chord tones (7-3-13: seventh, third, thirteenth)
 * gives the fingers that reach in it.
 */
/**
 * What a left hand's seventh-chord spread plays: all five reach, and a
 * four-note voicing takes 5-4-2-1 or 5-3-2-1 by its key and shape, the
 * other finger hovering over its key.
 */
const SEVENTH = [
  [1, 2, 4, 5],
  [1, 2, 3, 5],
  [1, 2, 3, 4, 5],
];

const CATALOG = {
  'LH 12.svg': {
    hand: 'lh',
    plays: [1, 2],
    tips: {
      5: [218, 491],
      4: [454, 367],
      3: [663, 307],
      2: [956, 67],
      1: [1244, 518],
    },
  },
  'LH 123.svg': {
    hand: 'lh',
    plays: [1, 2, 3],
    tips: {
      5: [120, 600],
      4: [372, 374],
      3: [638, 39],
      2: [918, 157],
      1: [1208, 630],
    },
  },
  'LH 123_.svg': {
    hand: 'lh',
    plays: [1, 2, 3],
    tips: {
      5: [196, 832],
      4: [414, 471],
      3: [513, 46],
      2: [848, 118],
      1: [1221, 522],
    },
  },
  'LH 1234_1 or 5-1.svg': {
    hand: 'lh',
    plays: [1, 2, 3, 4, 5],
    uses: [
      [1, 2, 3, 4],
      [1, 5],
    ],
    tips: {
      5: [89, 530],
      4: [458, 88],
      3: [679, 61],
      2: [992, 224],
      1: [1258, 679],
    },
  },
  'LH 5432.svg': {
    hand: 'lh',
    plays: [2, 3, 4, 5],
    tips: {
      5: [131, 316],
      4: [465, 94],
      3: [726, 64],
      2: [1023, 180],
      1: [1293, 910],
    },
  },
  'LH.svg': {
    hand: 'lh',
    plays: [2, 3, 4, 5],
    tips: {
      5: [98, 349],
      4: [449, 89],
      3: [676, 65],
      2: [1084, 298],
      1: [1261, 718],
    },
  },
  'LH 54321.svg': {
    hand: 'lh',
    plays: [1, 2, 3, 4, 5],
    neutral: true,
    tips: {
      5: [67, 473],
      4: [311, 228],
      3: [530, 168],
      2: [798, 259],
      1: [1066, 628],
    },
  },
  'LH 54321_1.svg': {
    hand: 'lh',
    plays: [1, 2, 3, 4, 5],
    neutral: true,
    tips: {
      5: [60, 438],
      4: [335, 236],
      3: [527, 217],
      2: [805, 333],
      1: [1064, 749],
    },
  },
  'LH 1357 3579_.svg': {
    hand: 'lh',
    plays: [1, 2, 3, 4, 5],
    uses: SEVENTH,
    tips: {
      5: [34, 469],
      4: [364, 186],
      3: [557, 14],
      2: [885, 188],
      1: [1311, 663],
    },
  },
  'LH 3579 or 1357.svg': {
    hand: 'lh',
    plays: [1, 2, 3, 4, 5],
    uses: SEVENTH,
    tips: {
      5: [93, 461],
      4: [405, 210],
      3: [624, 32],
      2: [898, 192],
      1: [1309, 641],
    },
  },
  'LH 7935_.svg': {
    hand: 'lh',
    plays: [1, 2, 3, 4, 5],
    uses: SEVENTH,
    tips: {
      5: [78, 520],
      4: [264, 171],
      3: [472, 232],
      2: [668, 276],
      1: [1065, 786],
    },
  },
  'LH 7th chord.svg': {
    hand: 'lh',
    plays: [1, 2, 3, 4, 5],
    uses: SEVENTH,
    tips: {
      5: [205, 326],
      4: [444, 26],
      3: [718, 103],
      2: [941, 224],
      1: [1289, 788],
    },
  },
  'LH 7th chord_2.svg': {
    hand: 'lh',
    plays: [1, 2, 3, 4, 5],
    uses: [...SEVENTH, [1, 3, 5], [1, 4, 5]],
    tips: {
      5: [147, 467],
      4: [275, 154],
      3: [496, 64],
      2: [905, 125],
      1: [1384, 699],
    },
  },
  'LH wide interval_.svg': {
    hand: 'lh',
    plays: [1, 2, 3, 4, 5],
    uses: [[1, 5]],
    span: [5, 1, 7],
    tips: {
      5: [116, 572],
      4: [321, 176],
      3: [539, 32],
      2: [831, 74],
      1: [1389, 800],
    },
  },
  'LH 7935 7th chord.svg': {
    hand: 'lh',
    plays: [1, 2, 3, 5],
    tips: {
      5: [307, 138],
      4: [467, 390],
      3: [676, 63],
      2: [922, 122],
      1: [1287, 608],
    },
  },
  'LH 7935_2.svg': {
    hand: 'lh',
    plays: [1, 2, 3, 5],
    tips: {
      5: [227, 288],
      4: [462, 468],
      3: [643, 101],
      2: [865, 62],
      1: [1313, 527],
    },
  },
  'LH root position triad 135.svg': {
    hand: 'lh',
    plays: [1, 3, 5],
    tips: {
      5: [142, 268],
      4: [390, 509],
      3: [606, 50],
      2: [892, 447],
      1: [1252, 560],
    },
  },
  'LH 2nd inversion triad.svg': {
    hand: 'lh',
    plays: [1, 2, 5],
    tips: { 5: [249, 245], 4: [452, 478], 2: [852, 91], 1: [1239, 517] },
  },
  'LH 3-7-9.svg': {
    hand: 'lh',
    plays: [1, 2, 5],
    tips: {
      5: [190, 119],
      4: [529, 398],
      3: [753, 381],
      2: [956, 154],
      1: [1375, 547],
    },
  },
  'LH 7-3-13 or 3-6-9.svg': {
    hand: 'lh',
    plays: [1, 2, 5],
    tips: {
      5: [237, 199],
      4: [575, 419],
      3: [780, 400],
      2: [950, 115],
      1: [1341, 584],
    },
  },
  'LH 7-3-13_.svg': {
    hand: 'lh',
    plays: [1, 2, 5],
    tips: { 5: [104, 385], 3: [636, 509], 2: [763, 49], 1: [1262, 559] },
  },
  'LH 7-3-5 or 5-1-2_.svg': {
    hand: 'lh',
    plays: [1, 2, 5],
    tips: { 5: [393, 206], 3: [787, 429], 2: [954, 93], 1: [1361, 529] },
  },
  'LH 735 or 7-3-13.svg': {
    hand: 'lh',
    plays: [1, 2, 5],
    tips: {
      5: [133, 225],
      4: [428, 469],
      3: [659, 415],
      2: [841, 71],
      1: [1278, 546],
    },
  },
  'LH power chord 1-5-8.svg': {
    hand: 'lh',
    plays: [1, 2, 5],
    span: [5, 1, 7],
    tips: {
      5: [49, 628],
      4: [228, 290],
      3: [405, 179],
      2: [679, 270],
      1: [1057, 805],
    },
  },
  'LH sus4.svg': {
    hand: 'lh',
    plays: [1, 2, 5],
    tips: {
      5: [389, 112],
      4: [530, 386],
      3: [709, 388],
      2: [928, 93],
      1: [1278, 568],
    },
  },
  'LH r.svg': {
    hand: 'lh',
    plays: [1, 2, 4],
    tips: {
      5: [74, 601],
      4: [355, 236],
      3: [539, 413],
      2: [771, 273],
      1: [1062, 710],
    },
  },
  'LH sus2.svg': {
    hand: 'lh',
    plays: [1, 3, 4],
    tips: {
      5: [174, 627],
      4: [366, 233],
      3: [554, 211],
      2: [811, 642],
      1: [1073, 672],
    },
  },
  'LH sus2_2.svg': {
    hand: 'lh',
    plays: [1, 3, 4],
    tips: {
      5: [142, 697],
      4: [311, 233],
      3: [538, 191],
      2: [760, 721],
      1: [1066, 648],
    },
  },
  'LH octave.svg': {
    hand: 'lh',
    plays: [1, 5],
    span: [5, 1, 7],
    tips: {
      5: [90, 186],
      4: [474, 345],
      3: [670, 265],
      2: [914, 254],
      1: [1406, 422],
    },
  },

  'RH Thumb alone.svg': {
    hand: 'rh',
    plays: [1],
    tips: {
      1: [149, 402],
      2: [541, 82],
      3: [800, 60],
      4: [994, 212],
      5: [1303, 523],
    },
  },
  'RH 12.svg': {
    hand: 'rh',
    plays: [1, 2],
    tips: {
      1: [80, 500],
      2: [429, 47],
      3: [743, 158],
      4: [994, 301],
      5: [1235, 536],
    },
  },
  'RH 123.svg': {
    hand: 'rh',
    plays: [1, 2, 3],
    tips: {
      1: [7, 622],
      2: [415, 108],
      3: [656, 1],
      4: [1000, 350],
      5: [1304, 577],
    },
  },
  'RH 1234.svg': {
    hand: 'rh',
    plays: [1, 2, 3, 4],
    tips: {
      1: [48, 623],
      2: [418, 159],
      3: [641, 76],
      4: [892, 151],
      5: [1282, 572],
    },
  },
  'RH 12345_1.svg': {
    hand: 'rh',
    plays: [1, 2, 3, 4, 5],
    neutral: true,
    tips: {
      1: [52, 531],
      2: [423, 83],
      3: [640, 23],
      4: [856, 112],
      5: [1216, 431],
    },
  },
  'RH 12345_2.svg': {
    hand: 'rh',
    plays: [1, 2, 3, 4, 5],
    neutral: true,
    tips: {
      1: [65, 643],
      2: [411, 125],
      3: [648, 32],
      4: [892, 118],
      5: [1142, 313],
    },
  },
  'RH 234.svg': {
    hand: 'rh',
    plays: [2, 3, 4],
    tips: {
      1: [38, 670],
      2: [367, 160],
      3: [642, 66],
      4: [939, 154],
      5: [1320, 647],
    },
  },
  'RH 345.svg': {
    hand: 'rh',
    plays: [3, 4, 5],
    tips: {
      1: [73, 710],
      2: [270, 363],
      3: [579, 25],
      4: [885, 111],
      5: [1161, 326],
    },
  },
  'RH 124.svg': {
    hand: 'rh',
    plays: [1, 2, 4],
    span: [1, 4, 4],
    tips: {
      1: [158, 503],
      2: [536, 89],
      3: [749, 422],
      4: [939, 72],
      5: [1195, 529],
    },
  },
  'RH root position triad Thumb Index Ring.svg': {
    hand: 'rh',
    plays: [1, 2, 4],
    tips: {
      1: [33, 729],
      2: [415, 384],
      3: [639, 156],
      4: [845, 417],
      5: [1041, 731],
    },
  },
  'RH sus2.svg': {
    hand: 'rh',
    plays: [1, 2, 4],
    tips: {
      1: [130, 436],
      2: [472, 94],
      3: [760, 342],
      4: [1021, 66],
      5: [1312, 612],
    },
  },
  'RH Root Position Triad Thumb Middle Pinky.svg': {
    hand: 'rh',
    plays: [1, 3, 5],
    tips: {
      1: [35, 643],
      2: [346, 164],
      3: [532, 219],
      4: [729, 129],
      5: [1003, 426],
    },
  },
  'RH 2nd inversion triad.svg': {
    hand: 'rh',
    plays: [1, 3, 5],
    tips: {
      1: [15, 661],
      2: [469, 377],
      3: [655, 118],
      4: [865, 607],
      5: [1022, 441],
    },
  },
  'RH power chord 158.svg': {
    hand: 'rh',
    plays: [1, 3, 5],
    span: [1, 5, 7],
    tips: {
      1: [21, 661],
      2: [434, 516],
      3: [612, 284],
      4: [769, 663],
      5: [1067, 621],
    },
  },
  'RH 1st inversion triad.svg': {
    hand: 'rh',
    plays: [1, 2, 5],
    tips: {
      1: [62, 453],
      2: [556, 21],
      3: [759, 238],
      4: [1002, 378],
      5: [1182, 261],
    },
  },
  'RH power chord 1-5.svg': {
    hand: 'rh',
    plays: [1, 3],
    span: [1, 3, 4],
    tips: { 1: [51, 523], 2: [597, 345], 3: [854, 92], 5: [1070, 838] },
  },
  // Four-note close position (root position 7ths, 3-5-7-9): one drawing a
  // shape, by which keys are black.
  'RH_root position 7th chord white notes keys.svg': {
    hand: 'rh',
    plays: [1, 2, 4, 5],
    tips: {
      1: [17, 619],
      2: [417, 36],
      3: [733, 59],
      4: [945, 194],
      5: [1288, 440],
    },
  },
  'RH_white black white black 7th chord shape.svg': {
    hand: 'rh',
    plays: [1, 2, 4, 5],
    scale: 1.15,
    wash: 2.4,
    tips: {
      1: [19, 653],
      2: [344, 148],
      3: [567, 335],
      4: [749, 144],
      5: [1054, 480],
    },
  },
  'RH_white white black white OR black white black white 7th chord shape.svg': {
    hand: 'rh',
    plays: [1, 2, 3, 5],
    wash: 2.4,
    tips: {
      1: [13, 603],
      2: [434, 338],
      3: [836, 152],
      4: [899, 699],
      5: [1074, 688],
    },
  },
  'RH_137 voicing.svg': {
    hand: 'rh',
    plays: [1, 2, 5],
    tips: {
      1: [25, 650],
      2: [353, 328],
      3: [612, 139],
      4: [840, 211],
      5: [1047, 538],
    },
  },
};

// ── Geometry ────────────────────────────────────────────────────────────

const hypot = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

/** Douglas–Peucker on an open polyline. */
function simplify(points, eps) {
  if (points.length < 3) return points;
  const keep = new Uint8Array(points.length);
  keep[0] = keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    const [ax, ay] = points[a];
    const [bx, by] = points[b];
    const len = Math.hypot(bx - ax, by - ay) || 1e-9;
    let worst = -1;
    let far = 0;
    for (let i = a + 1; i < b; i++) {
      const [px, py] = points[i];
      const d = Math.abs((bx - ax) * (ay - py) - (ax - px) * (by - ay)) / len;
      if (d > far) {
        far = d;
        worst = i;
      }
    }
    if (far > eps && worst > 0) {
      keep[worst] = 1;
      stack.push([a, worst], [worst, b]);
    }
  }
  return points.filter((_, i) => keep[i]);
}

/** A closed loop simplified: split at its farthest pair so DP has two ends. */
function simplifyLoop(points, eps) {
  if (points.length < 8) return points;
  let far = 0;
  let j = 0;
  for (let i = 1; i < points.length; i++) {
    const d = hypot(points[0], points[i]);
    if (d > far) {
      far = d;
      j = i;
    }
  }
  const a = simplify(points.slice(0, j + 1), eps);
  const b = simplify([...points.slice(j), points[0]], eps);
  return [...a.slice(0, -1), ...b.slice(0, -1)];
}

/** A closed loop's points averaged with their r neighbors either side. */
function smoothLoop(points, r) {
  const n = points.length;
  return points.map((_, i) => {
    let x = 0;
    let y = 0;
    for (let k = -r; k <= r; k++) {
      const p = points[(i + k + n) % n];
      x += p[0];
      y += p[1];
    }
    return [x / (2 * r + 1), y / (2 * r + 1)];
  });
}

const fmt = (n) => {
  const r = Math.round(n * 10) / 10;
  return Object.is(r, -0) ? '0' : String(r);
};

/** Closed loops as a compact path: relative moves, one decimal. */
function loopsToPath(loops) {
  let d = '';
  let at = [0, 0];
  for (const loop of loops) {
    if (loop.length < 3) continue;
    const pts = loop.map(([x, y]) => [
      Math.round(x * 10) / 10,
      Math.round(y * 10) / 10,
    ]);
    d += `M${fmt(pts[0][0])} ${fmt(pts[0][1])}l`;
    let prev = pts[0];
    const steps = [];
    for (const p of pts.slice(1)) {
      steps.push(`${fmt(p[0] - prev[0])} ${fmt(p[1] - prev[1])}`);
      prev = p;
    }
    d += steps.join(' ').replace(/ -/g, '-') + 'z';
    at = pts[0];
  }
  void at;
  return d;
}

// ── The drawing's own lines ─────────────────────────────────────────────

/** VTracer's paths: absolute M, C and Z only, each under a translate. */
function svgLoops(svg) {
  const loops = [];
  for (const m of svg.matchAll(/<path\b([^>]*)\/?>/g)) {
    const attrs = m[1];
    const d = /\sd="([^"]+)"/.exec(attrs)?.[1];
    if (!d) continue;
    const t = /translate\(\s*([-\d.]+)[ ,]+([-\d.]+)\s*\)/.exec(attrs);
    const [tx, ty] = t ? [Number(t[1]), Number(t[2])] : [0, 0];
    const tokens = d.match(/[MCZ]|-?\d*\.?\d+(?:e-?\d+)?/gi);
    let loop = null;
    let cur = [0, 0];
    let i = 0;
    const num = () => Number(tokens[i++]);
    while (i < tokens.length) {
      const cmd = tokens[i++];
      if (cmd === 'M') {
        if (loop) loops.push(loop);
        cur = [num() + tx, num() + ty];
        loop = [cur];
      } else if (cmd === 'C') {
        // Cubic runs: as many triples as follow.
        while (i < tokens.length && !/[MCZ]/i.test(tokens[i])) {
          const c1 = [num() + tx, num() + ty];
          const c2 = [num() + tx, num() + ty];
          const p = [num() + tx, num() + ty];
          const n = Math.max(
            2,
            Math.ceil((hypot(cur, c1) + hypot(c1, c2) + hypot(c2, p)) / 3),
          );
          for (let s = 1; s <= n; s++) {
            const t = s / n;
            const u = 1 - t;
            loop.push([
              u * u * u * cur[0] +
                3 * u * u * t * c1[0] +
                3 * u * t * t * c2[0] +
                t * t * t * p[0],
              u * u * u * cur[1] +
                3 * u * u * t * c1[1] +
                3 * u * t * t * c2[1] +
                t * t * t * p[1],
            ]);
          }
          cur = p;
        }
      } else if (cmd === 'Z' || cmd === 'z') {
        if (loop) loops.push(loop);
        loop = null;
      } else throw new Error(`unexpected path command ${cmd}`);
    }
    if (loop) loops.push(loop);
  }
  return loops;
}

// ── Raster work: silhouette, outline, fingers ───────────────────────────

async function raster(svg, w, h) {
  const k = RASTER / Math.max(w, h);
  const W = Math.round(w * k);
  const H = Math.round(h * k);
  const { data } = await sharp(Buffer.from(svg), { density: 72 * k })
    .resize(W, H, { fit: 'fill' })
    .flatten({ background: '#fff' })
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const ink = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) ink[i] = data[i] < 140 ? 1 : 0;
  return { ink, W, H, k };
}

function dilate(mask, W, H, r) {
  const out = new Uint8Array(W * H);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (!mask[y * W + x]) continue;
      for (let dy = -r; dy <= r; dy++)
        for (let dx = -r; dx <= r; dx++) {
          if (dx * dx + dy * dy > r * r) continue;
          const X = x + dx;
          const Y = y + dy;
          if (X >= 0 && Y >= 0 && X < W && Y < H) out[Y * W + X] = 1;
        }
    }
  return out;
}

const neighbours = (i, W, H) => {
  const x = i % W;
  const y = (i / W) | 0;
  return [
    x > 0 ? i - 1 : -1,
    x < W - 1 ? i + 1 : -1,
    y > 0 ? i - W : -1,
    y < H - 1 ? i + W : -1,
  ];
};

/**
 * The hand's silhouette: everything the outside can't reach. The traced
 * outline has gaps, so the lines are thickened by r to seal them, the wrist
 * is closed between the lowest lines either side, and the outside then grows
 * back r over the paper the thickening hid.
 */
function silhouetteAt(ink, W, H, r) {
  const wall = dilate(ink, W, H, r);
  let mx = 0;
  let mn = 0;
  for (let i = 0; i < W * H; i++)
    if (ink[i]) {
      mx += i % W;
      mn++;
    }
  mx /= mn;
  const lowest = (side) => {
    for (let y = H - 1; y >= 0; y--)
      for (let x = 0; x < W; x++)
        if (ink[y * W + x] && (side < 0 ? x < mx : x > mx)) return [x, y];
    return null;
  };
  const a = lowest(-1);
  const b = lowest(1);
  if (a && b) {
    const steps = Math.ceil(hypot(a, b));
    for (let t = 0; t <= steps; t++) {
      const x = Math.round(a[0] + ((b[0] - a[0]) * t) / steps);
      const y = Math.round(a[1] + ((b[1] - a[1]) * t) / steps);
      for (let dy = -r; dy <= r; dy++)
        for (let dx = -r; dx <= r; dx++) {
          const X = x + dx;
          const Y = y + dy;
          if (X >= 0 && Y >= 0 && X < W && Y < H) wall[Y * W + X] = 1;
        }
    }
  }
  const out = new Uint8Array(W * H);
  const stack = [];
  const seed = (i) => {
    if (!wall[i] && !out[i]) {
      out[i] = 1;
      stack.push(i);
    }
  };
  for (let x = 0; x < W; x++) seed(x);
  for (let y = 0; y < H; y++) {
    seed(y * W);
    seed(y * W + W - 1);
  }
  while (stack.length)
    for (const j of neighbours(stack.pop(), W, H)) if (j >= 0) seed(j);
  const inkish = dilate(ink, W, H, 1);
  let front = [];
  for (let i = 0; i < W * H; i++) if (out[i]) front.push(i);
  for (let step = 0; step < r; step++) {
    const next = [];
    for (const i of front)
      for (const j of neighbours(i, W, H)) {
        if (j < 0 || out[j] || inkish[j]) continue;
        out[j] = 1;
        next.push(j);
      }
    front = next;
  }
  const sil = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) sil[i] = out[i] ? 0 : 1;
  return largest(sil, W, H);
}

function largest(mask, W, H) {
  const comp = new Int32Array(W * H).fill(-1);
  let best = -1;
  let bestN = 0;
  let id = 0;
  for (let s = 0; s < W * H; s++) {
    if (!mask[s] || comp[s] >= 0) continue;
    let n = 0;
    const st = [s];
    comp[s] = id;
    while (st.length) {
      const i = st.pop();
      n++;
      for (const j of neighbours(i, W, H))
        if (j >= 0 && mask[j] && comp[j] < 0) {
          comp[j] = id;
          st.push(j);
        }
    }
    if (n > bestN) {
      bestN = n;
      best = id;
    }
    id++;
  }
  const out = new Uint8Array(W * H);
  if (best >= 0)
    for (let i = 0; i < W * H; i++) out[i] = comp[i] === best ? 1 : 0;
  return { mask: out, area: bestN };
}

function silhouette(ink, W, H) {
  let x0 = W;
  let y0 = H;
  let x1 = 0;
  let y1 = 0;
  for (let i = 0; i < W * H; i++)
    if (ink[i]) {
      const x = i % W;
      const y = (i / W) | 0;
      x0 = Math.min(x0, x);
      y0 = Math.min(y0, y);
      x1 = Math.max(x1, x);
      y1 = Math.max(y1, y);
    }
  const box = (x1 - x0) * (y1 - y0);
  // A leak leaves only a thin band along the outline: seal harder.
  for (let r = 2; r <= 16; r++) {
    const s = silhouetteAt(ink, W, H, r);
    if (s.area >= 0.4 * box) return { ...s, r };
  }
  throw new Error('no closed silhouette');
}

/** Outer boundary of a mask (Moore neighbour trace), in pixel centers. */
function trace(mask, W, H) {
  const at = (x, y) => x >= 0 && y >= 0 && x < W && y < H && mask[y * W + x];
  let start = -1;
  for (let i = 0; i < W * H && start < 0; i++) if (mask[i]) start = i;
  if (start < 0) return [];
  const dirs = [
    [1, 0],
    [1, 1],
    [0, 1],
    [-1, 1],
    [-1, 0],
    [-1, -1],
    [0, -1],
    [1, -1],
  ];
  const sx = start % W;
  const sy = (start / W) | 0;
  const pts = [[sx, sy]];
  let x = sx;
  let y = sy;
  let d = 6;
  for (let guard = 0; guard < W * H * 4; guard++) {
    let found = false;
    for (let k = 0; k < 8; k++) {
      const nd = (d + 6 + k) % 8;
      if (at(x + dirs[nd][0], y + dirs[nd][1])) {
        x += dirs[nd][0];
        y += dirs[nd][1];
        d = nd;
        found = true;
        break;
      }
    }
    if (!found || (x === sx && y === sy)) break;
    pts.push([x, y]);
  }
  return pts;
}

/**
 * A finger from near its tip: the outline's nearest point to the catalog's
 * (and its place along the outline), the way the finger points, how wide it
 * is, and the middle of its pad.
 */
function measureFinger(near, img, sil, outline) {
  const { ink, W, H } = img;
  let at = 0;
  for (let i = 1; i < outline.length; i++)
    if (hypot(outline[i], near) < hypot(outline[at], near)) at = i;
  const P = outline[at];
  const inside = (x, y) => {
    const X = Math.round(x);
    const Y = Math.round(y);
    return X >= 0 && Y >= 0 && X < W && Y < H && sil[Y * W + X];
  };
  // Which way it points: from the tip to the middle of the hand within reach.
  const rho = RASTER * 0.045;
  let cx = 0;
  let cy = 0;
  let n = 0;
  for (let y = Math.floor(P[1] - rho); y <= P[1] + rho; y++)
    for (let x = Math.floor(P[0] - rho); x <= P[0] + rho; x++)
      if (inside(x, y) && Math.hypot(x - P[0], y - P[1]) <= rho) {
        cx += x;
        cy += y;
        n++;
      }
  let ux = cx / n - P[0];
  let uy = cy / n - P[1];
  const ul = Math.hypot(ux, uy) || 1;
  ux /= ul;
  uy /= ul;
  // Width: across the finger, out to its outline either side.
  const across = (d) => {
    const ax = P[0] + ux * d;
    const ay = P[1] + uy * d;
    const run = (sgn) => {
      for (let s = 1; s < RASTER * 0.12; s++) {
        const x = ax - uy * s * sgn;
        const y = ay + ux * s * sgn;
        if (!inside(x, y) || (s > 3 && ink[Math.round(y) * W + Math.round(x)]))
          return s;
      }
      return RASTER * 0.12;
    };
    return run(1) + run(-1);
  };
  const widths = [];
  for (let f = 0.8; f <= 2.2; f += 0.2) widths.push(across(rho * f));
  widths.sort((a, b) => a - b);
  const width = widths[Math.floor(widths.length * 0.5)];
  return {
    P,
    at,
    axis: [ux, uy],
    width,
    tip: [P[0] + (ux * width) / 2, P[1] + (uy * width) / 2],
  };
}

/**
 * The web between two fingers: of the outline between their tips, the point
 * deepest below the line joining them (fingers point up, so the web is on
 * the line's lower side).
 */
function valley(outline, a, b) {
  const n = outline.length;
  const fwd = (b - a + n) % n;
  const [from, len] = fwd <= n - fwd ? [a, fwd] : [b, n - fwd];
  const A = outline[a];
  const B = outline[b];
  let nx = -(B[1] - A[1]);
  let ny = B[0] - A[0];
  if (ny < 0) {
    nx = -nx;
    ny = -ny;
  }
  const depth = (p) => nx * (p[0] - A[0]) + ny * (p[1] - A[1]);
  let best = outline[from];
  for (let k = 0; k <= len; k++) {
    const p = outline[(from + k) % n];
    if (depth(p) > depth(best)) best = p;
  }
  return best;
}

/**
 * A playing finger's inside: flooded from its pad, held by the drawing's
 * lines, by its base (a line across it at the webs either side), and by a
 * capsule along it in case a gap in the drawing opens into the palm.
 */
function washFinger(fp, img, sil, base) {
  const { ink, W, H } = img;
  const { P, width } = fp;
  const [ux, uy] = fp.axis;
  const length = width * 3.6;
  const half = width * 0.7;
  const inCapsule = (x, y) => {
    const t = Math.max(0, Math.min(length, (x - P[0]) * ux + (y - P[1]) * uy));
    return Math.hypot(x - (P[0] + ux * t), y - (P[1] + uy * t)) <= half;
  };
  // Below the base, on the far side from the tip.
  const [b0, b1] = base;
  const side = (x, y) =>
    (b1[0] - b0[0]) * (y - b0[1]) - (b1[1] - b0[1]) * (x - b0[0]);
  const tipSide = Math.sign(side(P[0], P[1]));
  const above = (x, y) => Math.sign(side(x, y)) === tipSide;
  const ok = (i) => {
    const x = i % W;
    const y = (i / W) | 0;
    return sil[i] && !ink[i] && inCapsule(x, y) && above(x, y);
  };
  const region = new Uint8Array(W * H);
  let s0 = Math.round(fp.tip[1]) * W + Math.round(fp.tip[0]);
  if (!ok(s0)) {
    // The pad landed on a line: start from the nearest clear pixel.
    let best = Infinity;
    for (let y = Math.floor(fp.tip[1] - 8); y <= fp.tip[1] + 8; y++)
      for (let x = Math.floor(fp.tip[0] - 8); x <= fp.tip[0] + 8; x++) {
        const i = y * W + x;
        const d = Math.hypot(x - fp.tip[0], y - fp.tip[1]);
        if (i >= 0 && i < W * H && ok(i) && d < best) {
          best = d;
          s0 = i;
        }
      }
  }
  const stack = [s0];
  region[s0] = 1;
  while (stack.length)
    for (const j of neighbours(stack.pop(), W, H))
      if (j >= 0 && !region[j] && ok(j)) {
        region[j] = 1;
        stack.push(j);
      }
  // Under its own lines too, so the color meets them.
  const grown = dilate(region, W, H, 3);
  for (let i = 0; i < W * H; i++) {
    const x = i % W;
    const y = (i / W) | 0;
    grown[i] = grown[i] && sil[i] && inCapsule(x, y) && above(x, y) ? 1 : 0;
  }
  return largest(grown, W, H).mask;
}

/**
 * Where each playing finger meets the hand: the line between the webs either
 * side of it; for a finger on the hand's edge, the line through its one web,
 * square to it.
 */
function baseOf(f, order, fingers, webs, least = 1.5) {
  const i = order.indexOf(f);
  const left = order[i - 1];
  const right = order[i + 1];
  const vl = left !== undefined ? webs.get(`${left}|${f}`) : null;
  const vr = right !== undefined ? webs.get(`${f}|${right}`) : null;
  const { P, axis, width } = fingers[f];
  const along = (v) => (v[0] - P[0]) * axis[0] + (v[1] - P[1]) * axis[1];
  // Square to the finger, this far down it from the tip.
  const across = (d) => {
    const c = [P[0] + axis[0] * d, P[1] + axis[1] * d];
    const p = [-axis[1] * width * 1.5, axis[0] * width * 1.5];
    return [
      [c[0] - p[0], c[1] - p[1]],
      [c[0] + p[0], c[1] + p[1]],
    ];
  };
  // A web beside a curled finger can sit high, up by the tip: the base is
  // never less than `least` fingers' width down, nor more than three.
  const ok = (v) => v && along(v) >= width * least && along(v) <= width * 3.2;
  if (ok(vl) && ok(vr)) {
    const dx = vr[0] - vl[0];
    const dy = vr[1] - vl[1];
    return [
      [vl[0] - dx * 0.25, vl[1] - dy * 0.25],
      [vr[0] + dx * 0.25, vr[1] + dy * 0.25],
    ];
  }
  const webs2 = [vl, vr].filter(ok);
  const d = webs2.length
    ? along(webs2[0])
    : Math.min(
        width * 3.2,
        Math.max(width * least, ...[vl, vr].filter(Boolean).map(along)),
      );
  return across(d);
}

// ── Build ───────────────────────────────────────────────────────────────

const files = readdirSync(dir).filter((f) => f.endsWith('.svg'));
const missing = Object.keys(CATALOG).filter((f) => !files.includes(f));
if (missing.length) throw new Error(`not in ${dir}: ${missing.join(', ')}`);
const extra = files.filter((f) => !CATALOG[f]);
if (extra.length)
  console.warn(`not in the catalog, skipped: ${extra.join(', ')}`);

const built = [];
for (const [file, entry] of Object.entries(CATALOG)) {
  const svg = readFileSync(join(dir, file), 'utf8');
  const vb = /viewBox="([^"]+)"/
    .exec(svg)[1]
    .split(/[\s,]+/)
    .map(Number);
  const [, , vw, vh] = vb;
  const img = await raster(svg, vw, vh);
  const { mask: sil, r } = silhouette(img.ink, img.W, img.H);
  const outline = trace(sil, img.W, img.H);
  const fingers = {};
  for (const [f, at] of Object.entries(entry.tips))
    fingers[f] = measureFinger(
      [at[0] * img.k, at[1] * img.k],
      img,
      sil,
      outline,
    );
  for (const f of entry.plays)
    if (!fingers[f])
      throw new Error(`${file}: finger ${f} plays but has no tip`);
  for (const use of entry.uses ?? [])
    for (const f of use)
      if (!entry.plays.includes(f))
        throw new Error(`${file}: uses ${f}, which it doesn't play`);
  // Left to right as drawn, and the web between each pair.
  const order = (
    entry.hand === 'lh' ? [5, 4, 3, 2, 1] : [1, 2, 3, 4, 5]
  ).filter((f) => fingers[f]);
  const webs = new Map();
  for (let i = 0; i + 1 < order.length; i++)
    webs.set(
      `${order[i]}|${order[i + 1]}`,
      valley(outline, fingers[order[i]].at, fingers[order[i + 1]].at),
    );
  for (const f of entry.plays) {
    fingers[f].wash = washFinger(
      fingers[f],
      img,
      sil,
      baseOf(f, order, fingers, webs, entry.wash),
    );
    if (!fingers[f].wash.some(Boolean))
      throw new Error(`${file}: finger ${f} has no inside`);
  }
  // Its size: across its knuckles, from the web of 2 and 3 to the web of 4
  // and 5; where a curled finger hides a web, its fingers' width.
  const w23 = webs.get(entry.hand === 'lh' ? '3|2' : '2|3');
  const w45 = webs.get(entry.hand === 'lh' ? '5|4' : '4|5');
  const knuckles = w23 && w45 ? hypot(w23, w45) / img.k : null;
  const measured = entry.plays
    .filter((f) => f !== 1)
    .map((f) => fingers[f].width);
  const all = Object.entries(fingers)
    .filter(([f]) => f !== '1')
    .map(([, v]) => v.width);
  const ws = (measured.length ? measured : all).sort((x, y) => x - y);
  const fingerWidth = ws[Math.floor(ws.length / 2)] / img.k;
  built.push({
    file,
    entry,
    img,
    sil,
    r,
    outline,
    fingers,
    fingerWidth,
    knuckles,
    webs,
  });
}

// A white key in each drawing's units. The five-finger drawings' tips (2 to
// 5) sit three keys apart; against that, their knuckles' span (or, failing
// it, their fingers' width) sets what a key is in every drawing. The
// drawings' fingers lie close together, so a hand that size has fingers
// near a key wide where a real one's are about 0.72 (17 mm on a 23.5 mm
// key): SIZE takes it toward that as far as the fingertips still reach
// their keys, the hand stretching across a little to them.
const SIZE = 0.92;
/** How much bigger a drawing of a reach may be drawn to make it. */
const REACH_GROWTH = 1.25;
const neutral = built.filter((b) => b.entry.neutral);
const keyOf = (b) =>
  Math.abs(b.fingers[5].tip[0] - b.fingers[2].tip[0]) / b.img.k / 3;
const mean = (xs) => xs.reduce((s, x) => s + x, 0) / xs.length;
const perKnuckles = mean(neutral.map((b) => b.knuckles / keyOf(b))) * SIZE;
const perFinger = mean(neutral.map((b) => b.fingerWidth / keyOf(b))) * SIZE;

const poses = built.map((b) => {
  const { file, entry, img, outline, fingers, fingerWidth, knuckles } = b;
  // Drawing units a white key: by its knuckles (or fingers); a drawing of a
  // reach a little bigger, toward it (seen from the player's eye the tips,
  // further off, look closer than they are, so a reach drawn to scale would
  // be a giant's hand); times any correction the catalog gives.
  const bySize = knuckles ? knuckles / perKnuckles : fingerWidth / perFinger;
  const byReach = entry.span
    ? Math.abs(fingers[entry.span[1]].tip[0] - fingers[entry.span[0]].tip[0]) /
      img.k /
      entry.span[2]
    : bySize;
  const unit = Math.max(byReach, bySize / REACH_GROWTH) * (entry.scale ?? 1);
  const s = KEY / unit;
  // Origin: the silhouette's top left.
  let x0 = Infinity;
  let y0 = Infinity;
  for (const [x, y] of outline) {
    x0 = Math.min(x0, x / img.k);
    y0 = Math.min(y0, y / img.k);
  }
  const norm = ([x, y]) => [(x - x0) * s, (y - y0) * s];
  const px = ([x, y]) => norm([x / img.k, y / img.k]);
  // Raster outlines step pixel by pixel: smooth them before simplifying.
  const loop = (pts, eps) => simplifyLoop(smoothLoop(pts, 2).map(px), eps);
  const svg = readFileSync(join(dir, file), 'utf8');
  const lines = svgLoops(svg)
    .map((l) => simplifyLoop(l.map(norm), 0.5))
    .filter((l) => l.length >= 3);
  let x1 = 0;
  let y1 = 0;
  for (const [x, y] of outline.map(px)) {
    x1 = Math.max(x1, x);
    y1 = Math.max(y1, y);
  }
  const id = file
    .replace(/\.svg$/, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return {
    id,
    file,
    hand: entry.hand,
    plays: [...entry.plays].sort(),
    uses: (entry.uses ?? [entry.plays]).map((u) => [...u].sort()),
    neutral: !!entry.neutral,
    size: [Math.round(x1), Math.round(y1)],
    paper: loopsToPath([loop(outline, 1)]),
    lines: loopsToPath(lines),
    fingers: Object.fromEntries(
      entry.plays.map((f) => {
        const v = fingers[f];
        const [tx, ty] = px(v.tip);
        // Where its inside ends, down the finger: the wash fades out to it.
        let end = 0;
        v.wash.forEach((on, i) => {
          if (on)
            end = Math.max(
              end,
              ((i % img.W) - v.P[0]) * v.axis[0] +
                (((i / img.W) | 0) - v.P[1]) * v.axis[1],
            );
        });
        const [rx, ry] = px([
          v.P[0] + v.axis[0] * end,
          v.P[1] + v.axis[1] * end,
        ]);
        const r1 = (n) => Math.round(n * 10) / 10;
        return [
          f,
          {
            tip: [r1(tx), r1(ty)],
            root: [r1(rx), r1(ry)],
            wash: loopsToPath([loop(trace(v.wash, img.W, img.H), 1)]),
          },
        ];
      }),
    ),
    // Every finger's tip, playing or not, for review.
    allTips: Object.fromEntries(
      Object.entries(fingers).map(([f, v]) => [f, px(v.tip)]),
    ),
    webs: Object.fromEntries([...b.webs].map(([k, v]) => [k, px(v)])),
  };
});

const body = poses
  .map(
    (p) => `  {
    id: ${JSON.stringify(p.id)},
    hand: '${p.hand}',
    plays: [${p.plays.join(', ')}],
    uses: [${p.uses.map((u) => `[${u.join(', ')}]`).join(', ')}],${p.neutral ? '\n    neutral: true,' : ''}
    size: [${p.size.join(', ')}],
    fingers: {
${Object.entries(p.fingers)
  .map(
    ([f, v]) =>
      `      ${f}: { tip: [${v.tip.join(', ')}], root: [${v.root.join(', ')}], wash: ${JSON.stringify(v.wash)} },`,
  )
  .join('\n')}
    },
    paper: ${JSON.stringify(p.paper)},
    lines: ${JSON.stringify(p.lines)},
  },`,
  )
  .join('\n');

writeFileSync(
  OUT,
  `/**
 * Peter's hand drawings, one per hand shape, as Learn draws them over the
 * keys: a left hand little finger on the left, a right hand thumb on the
 * left, as the player sees their own. The top left of the hand at 0, 0.
 *
 * Generated by scripts/fingering/buildHandPoses.mjs from the drawings.
 * Don't edit; run the script again.
 */
import type { HandPoseArt } from './handPoseTypes';

/** Units to a white key. */
export const HAND_POSE_KEY = ${KEY};

export const HAND_POSE_ART: readonly HandPoseArt[] = [
${body}
];
`,
);
if (jsonOut) writeFileSync(jsonOut, JSON.stringify(poses));
console.log(`wrote ${poses.length} hands to ${OUT.pathname}`);
