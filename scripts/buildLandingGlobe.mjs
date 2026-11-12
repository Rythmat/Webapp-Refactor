#!/usr/bin/env node
/* eslint-env node */
/**
 * Draw the landing page's Globe demo as SVG paths, once.
 *
 *   node scripts/buildLandingGlobe.mjs
 *
 * The landing page shows a miniature of the Globe without its map engine or
 * any map download: this script projects the Globe's own outlines
 * (public/geo/, Natural Earth, built by buildGeo.mjs) with the demo's one
 * orthographic view (src/features/landing/tour/scenes/globe/orthographic.ts),
 * clips them at the horizon — a ring that goes round the back is closed
 * along the globe's edge — drops points closer than a fraction of a pixel and
 * writes the paths to globeArt.generated.ts next to it. Deterministic: run it
 * again after the outlines or the view change, and commit what it writes.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { format, resolveConfig } from 'prettier';
import { feature } from 'topojson-client';
// Plain TypeScript, which Node strips.
import { GEO_FILES } from '../src/components/atlas/data/geoFiles.ts';
import {
  GLOBE_VIEW,
  toBoard,
  toView,
} from '../src/features/landing/tour/scenes/globe/orthographic.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(
  ROOT,
  'src/features/landing/tour/scenes/globe/globeArt.generated.ts',
);

/**
 * Points closer than this (art-board px) to the last one kept are dropped.
 * The board is 1000 px across and the demo shows it at most ~4× when it
 * flies in, so the countries keep detail to about 4 screen px; the states it
 * lifts keep more.
 */
const COUNTRY_TOLERANCE = 1;
const STATE_TOLERANCE = 0.25;
/** The states the demo lifts, by Natural Earth name. */
const STATES = { louisiana: 'Louisiana', michigan: 'Michigan' };
/** Steps along the globe's edge where a clipped ring is closed. */
const LIMB_STEP = (3 * Math.PI) / 180;

const load = (path, object) => {
  const topo = JSON.parse(readFileSync(join(ROOT, 'public', path), 'utf8'));
  return feature(topo, topo.objects[object]).features;
};

/** Natural Earth's ISO code, as the Globe reads it (`resolveIso`). */
const isoOf = ({ properties: p }) => {
  const a3 = p.ISO_A3 ?? p.iso_a3 ?? '';
  if (a3 !== '-99') return a3;
  return p.ISO_A3_EH && p.ISO_A3_EH !== '-99' ? p.ISO_A3_EH : p.ADM0_A3;
};

/** Where segment a→b crosses the horizon (z = 0), on the unit circle. */
const crossing = (a, b) => {
  const t = a[2] / (a[2] - b[2]);
  const x = a[0] + t * (b[0] - a[0]);
  const y = a[1] + t * (b[1] - a[1]);
  const len = Math.hypot(x, y);
  return [x / len, y / len, 0];
};

/** Points along the globe's edge from one horizon point to another (short way). */
const limbArc = (from, to) => {
  const a0 = Math.atan2(from[1], from[0]);
  let d = Math.atan2(to[1], to[0]) - a0;
  if (d > Math.PI) d -= 2 * Math.PI;
  if (d < -Math.PI) d += 2 * Math.PI;
  const steps = Math.floor(Math.abs(d) / LIMB_STEP);
  const out = [];
  for (let i = 1; i <= steps; i++) {
    const a = a0 + (d * i) / (steps + 1);
    out.push([Math.cos(a), Math.sin(a), 0]);
  }
  return out;
};

/**
 * A ring's visible part in view space, closed along the edge where it goes
 * round the back; null when none of it faces the viewer.
 */
const clipRing = (ring) => {
  const pts = ring.map(([lng, lat]) => toView(lat, lng));
  if (pts.length > 1) pts.pop(); // GeoJSON repeats the first point.
  const start = pts.findIndex((p) => p[2] > 0);
  if (start < 0) return null;
  const n = pts.length;
  const out = [];
  let exit = null;
  for (let i = 0; i < n; i++) {
    const a = pts[(start + i) % n];
    const b = pts[(start + i + 1) % n];
    if (a[2] > 0) out.push(a);
    if (a[2] > 0 && b[2] <= 0) {
      exit = crossing(a, b);
      out.push(exit);
    } else if (a[2] <= 0 && b[2] > 0) {
      const entry = crossing(a, b);
      out.push(...limbArc(exit, entry), entry);
      exit = null;
    }
  }
  return out;
};

const tenth = (v) => Math.round(v * 10);
/** Tenths as SVG's shortest number: "0.5" → ".5", "-0.5" → "-.5". */
const num = (t) => (t / 10).toString().replace(/^(-?)0\./, '$1.');
/**
 * Joins numbers the way SVG parses them: a "-" always starts a new number,
 * and a "." does after a number that already has one ("1.5" ".5" → "1.5.5").
 */
const joinNums = (nums) =>
  nums.reduce((out, n, i) => {
    const prev = nums[i - 1];
    const tight =
      n.startsWith('-') || (n.startsWith('.') && prev?.includes('.'));
    return i === 0 || tight ? out + n : `${out} ${n}`;
  }, '');

/** A ring as a relative SVG path, in tenths of a board px. */
const ringPath = (viewPts, tolerance) => {
  const kept = [];
  for (const p of viewPts) {
    const [x, y] = toBoard(p);
    const last = kept.at(-1);
    if (last && Math.hypot(x - last[0], y - last[1]) < tolerance) continue;
    kept.push([x, y]);
  }
  if (kept.length < 3) return '';
  const q = kept.map(([x, y]) => [tenth(x), tenth(y)]);
  const deltas = [];
  for (let i = 1; i < q.length; i++) {
    const dx = q[i][0] - q[i - 1][0];
    const dy = q[i][1] - q[i - 1][1];
    if (dx || dy) deltas.push(num(dx), num(dy));
  }
  // One "l" covers every pair after it.
  return `M${joinNums([num(q[0][0]), num(q[0][1])])}l${joinNums(deltas)}z`;
};

const featurePath = (f, tolerance) => {
  const g = f.geometry;
  if (!g) return '';
  const polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
  return polys
    .flatMap((poly) => poly.map(clipRing))
    .filter(Boolean)
    .map((ring) => ringPath(ring, tolerance))
    .join('');
};

/** A feature's box on the art board (whole px, outward): [x0, y0, x1, y1]. */
const boxOf = (f) => {
  const g = f.geometry;
  const polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
  const xy = polys
    .flatMap((poly) => poly.map(clipRing))
    .filter(Boolean)
    .flat()
    .map(toBoard);
  const xs = xy.map(([x]) => x);
  const ys = xy.map(([, y]) => y);
  return [
    Math.floor(Math.min(...xs)),
    Math.floor(Math.min(...ys)),
    Math.ceil(Math.max(...xs)),
    Math.ceil(Math.max(...ys)),
  ];
};

const countries = load(GEO_FILES.countries, 'countries')
  .map((f) => [isoOf(f), featurePath(f, COUNTRY_TOLERANCE)])
  .filter(([, d]) => d)
  .sort(([a], [b]) => a.localeCompare(b));

const stateFeatures = load(GEO_FILES.states, 'states');
const states = Object.entries(STATES).map(([key, name]) => {
  const f = stateFeatures.find((s) => s.properties.name === name);
  if (!f) throw new Error(`No ${name} in ${GEO_FILES.states}`);
  return [key, featurePath(f, STATE_TOLERANCE), boxOf(f)];
});

const lines = [
  '// GENERATED by scripts/buildLandingGlobe.mjs. Do not edit; re-run the script.',
  '',
  '/**',
  ` * The countries facing the demo's view (${GLOBE_VIEW.lat}°, ${GLOBE_VIEW.lng}°) as`,
  ' * SVG paths on its art board, by ISO code, clipped at the horizon.',
  ' */',
  'export const COUNTRY_PATHS: readonly (readonly [iso: string, d: string])[] = [',
  ...countries.map(([iso, d]) => `  ['${iso}', '${d}'],`),
  '];',
  '',
  '/** The states the demo lifts, in more detail. */',
  'export const STATE_PATHS = {',
  ...states.map(([key, d]) => `  ${key}: '${d}',`),
  '} as const;',
  '',
  '/** Their boxes on the art board: [x0, y0, x1, y1]. */',
  'export const STATE_BOXES = {',
  ...states.map(([key, , box]) => `  ${key}: [${box.join(', ')}],`),
  '} as const;',
  '',
];
// In the repo's own style, so prettier leaves it as written.
const text = await format(lines.join('\n'), {
  ...(await resolveConfig(OUT)),
  filepath: OUT,
});
writeFileSync(OUT, text);
const kb = (Buffer.byteLength(text) / 1024).toFixed(1);
console.log(
  `Wrote ${countries.length} countries and ${states.length} states (${kb} kB) to ${OUT}`,
);
