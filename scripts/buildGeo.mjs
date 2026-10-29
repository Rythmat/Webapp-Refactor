#!/usr/bin/env node
/* eslint-env node */
/**
 * Build the Globe's country and state outlines as compact same-origin
 * TopoJSON.
 *
 *   node scripts/buildGeo.mjs            # build from the cached downloads
 *   node scripts/buildGeo.mjs --refresh  # download Natural Earth again first
 *
 * The Globe used to fetch Natural Earth's GeoJSON from jsDelivr at run time:
 * 839 kB for the countries and 2.3 MB for the admin-1 file, of which it kept
 * only the US states and Canadian provinces and read four or five of the
 * ~170 properties per feature. This script does that work once:
 *
 *   1. downloads both files (cached in node_modules/.cache/build-geo);
 *   2. applies the fixes geoLoader used to apply in the browser
 *      (src/components/atlas/data/geoFixes.ts: French Guiana split out of
 *      France, Michigan's two peninsulas);
 *   3. keeps the US/CA states and only the properties the code reads;
 *   4. converts to TopoJSON (shared borders stored once), simplifies the
 *      states lightly (see STATE_MIN_WEIGHT) and quantizes the coordinates;
 *   5. writes public/geo/<name>.<hash>.topo.json, plus
 *      src/components/atlas/data/geoFiles.ts naming those files, plus the
 *      reference the decode test compares against
 *      (src/components/atlas/data/__tests__/fixtures/geoReference.json).
 *
 * The file names carry a hash of their contents, so a rebuilt file is a new
 * URL: browsers and the 'ma-geo-v2' Cache Storage never serve a stale copy.
 * Commit everything it writes.
 */
import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { quantize } from 'topojson-client';
import { topology } from 'topojson-server';
import {
  presimplify,
  simplify,
  sphericalTriangleArea,
} from 'topojson-simplify';
// Plain TypeScript, which Node strips: the same fixes the browser fallback
// applies, and the same URLs.
import {
  fixMichigan,
  splitFrenchGuiana,
} from '../src/components/atlas/data/geoFixes.ts';
import { GEOJSON_URLS } from '../src/components/atlas/data/menuItems.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CACHE = join(ROOT, 'node_modules/.cache/build-geo');
const OUT = join(ROOT, 'public/geo');
const MANIFEST = join(ROOT, 'src/components/atlas/data/geoFiles.ts');
const REFERENCE = join(
  ROOT,
  'src/components/atlas/data/__tests__/fixtures/geoReference.json',
);

/**
 * Coordinates snap to a 100,000-step grid over each file's extent: about
 * 0.0036° (400 m) for the world and for the US/CA states, whose extent spans
 * the antimeridian with the Aleutians. Far below a pixel at any zoom the
 * Globe flies to.
 */
const QUANTIZATION = 1e5;

/**
 * Visvalingam weight (triangle area in steradians on the unit sphere) under
 * which a state outline's point is dropped. 1e-7 sr is about 4 km² of
 * triangle (1e-7 × 6371² km²). Measured against the unsimplified outlines on
 * 13 Oct 2026, it removes 28% of the points, moves no edge more than 2.4 km
 * and 99% of them less than 1.1 km. The closest the Globe flies (zoom 10,
 * altitude 0.5) shows about 3.3 km per CSS pixel, so that stays under a pixel.
 * 3e-7 would move edges up to 15 km, which shows.
 *
 * The countries file is Natural Earth's 1:110m set, already as coarse as the
 * globe can take; it is not simplified.
 */
const STATE_MIN_WEIGHT = 1e-7;

/** The properties the code reads (the Globe's map, Home's globe, the thumbnails). */
const COUNTRY_PROPS = ['NAME', 'ISO_A3', 'ISO_A3_EH', 'ADM0_A3'];
const STATE_PROPS = ['name', 'iso_a2', 'adm0_a3'];

const refresh = process.argv.includes('--refresh');

async function download(name, url) {
  const file = join(CACHE, `${name}.geojson`);
  if (!refresh && existsSync(file)) {
    console.log(`build-geo: ${name} from the cache (${file})`);
    return JSON.parse(readFileSync(file, 'utf8'));
  }
  console.log(`build-geo: downloading ${url}`);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  const text = await response.text();
  mkdirSync(CACHE, { recursive: true });
  writeFileSync(file, text);
  return JSON.parse(text);
}

const pick = (properties, keys) =>
  Object.fromEntries(
    keys.filter((k) => properties?.[k] != null).map((k) => [k, properties[k]]),
  );

const keepProps = (features, keys) =>
  features.map((f) => ({
    type: 'Feature',
    properties: pick(f.properties, keys),
    geometry: f.geometry,
  }));

function build(name, features, minWeight) {
  let topo = topology({ [name]: { type: 'FeatureCollection', features } });
  if (minWeight > 0) {
    topo = simplify(presimplify(topo, sphericalTriangleArea), minWeight);
  }
  return quantize(topo, QUANTIZATION);
}

/** Bounding box of a feature's geometry, rounded to 0.01°. */
function bbox(geometry) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const walk = (c) => {
    if (typeof c[0] === 'number') {
      minX = Math.min(minX, c[0]);
      maxX = Math.max(maxX, c[0]);
      minY = Math.min(minY, c[1]);
      maxY = Math.max(maxY, c[1]);
    } else c.forEach(walk);
  };
  walk(geometry.coordinates);
  return [minX, minY, maxX, maxY].map((v) => Math.round(v * 100) / 100);
}

/** What the old GeoJSON path produced, for the decode test. */
const reference = (features, keys) =>
  features.map((f) => ({
    ...pick(f.properties, keys),
    bbox: bbox(f.geometry),
  }));

function write(name, topo) {
  const json = JSON.stringify(topo);
  const hash = createHash('sha256').update(json).digest('hex').slice(0, 10);
  const file = `${name}.${hash}.topo.json`;
  writeFileSync(join(OUT, file), json);
  return { url: `/geo/${file}`, bytes: Buffer.byteLength(json) };
}

const countriesRaw = await download('countries', GEOJSON_URLS.countries);
const admin1Raw = await download('admin1', GEOJSON_URLS.admin1);

// Exactly what geoLoader.ts did in the browser.
const countries = splitFrenchGuiana(countriesRaw.features);
const states = fixMichigan(
  admin1Raw.features.filter(
    (f) => f.properties?.iso_a2 === 'US' || f.properties?.iso_a2 === 'CA',
  ),
);

mkdirSync(OUT, { recursive: true });
for (const old of readdirSync(OUT)) {
  if (old.endsWith('.topo.json')) rmSync(join(OUT, old));
}
const out = {
  countries: write(
    'countries',
    build('countries', keepProps(countries, COUNTRY_PROPS), 0),
  ),
  states: write(
    'us-ca-states',
    build('states', keepProps(states, STATE_PROPS), STATE_MIN_WEIGHT),
  ),
};

writeFileSync(
  MANIFEST,
  `// GENERATED by scripts/buildGeo.mjs. Do not edit; re-run the script.

/**
 * The Globe's outlines, served from public/geo/. Each name carries a hash of
 * the file's contents, so a rebuild is a new URL.
 */
export const GEO_FILES = {
  /** World countries (Natural Earth 1:110m), object \`countries\`. ${out.countries.bytes} bytes. */
  countries: '${out.countries.url}',
  /** US states and Canadian provinces (Natural Earth 1:50m admin-1), object \`states\`. ${out.states.bytes} bytes. */
  states: '${out.states.url}',
} as const;
`,
);

// One feature per line, so a rebuild's diff reads as the features it changed.
const lines = (list) => list.map((r) => `  ${JSON.stringify(r)}`).join(',\n');
mkdirSync(dirname(REFERENCE), { recursive: true });
writeFileSync(
  REFERENCE,
  `{
 "note": "GENERATED by scripts/buildGeo.mjs from the Natural Earth GeoJSON after the same fixes geoLoader applied in the browser. geoTopo.test.ts checks the TopoJSON decodes to these.",
 "countries": [
${lines(reference(countries, COUNTRY_PROPS))}
 ],
 "states": [
${lines(reference(states, STATE_PROPS))}
 ]
}
`,
);

const kb = (n) => `${(n / 1000).toFixed(1)} kB`;
console.log(
  `build-geo: countries ${countries.length} features, ${kb(JSON.stringify(countriesRaw).length)} GeoJSON → ${kb(out.countries.bytes)} ${out.countries.url}`,
);
console.log(
  `build-geo: states ${states.length} features, ${kb(JSON.stringify(admin1Raw).length)} GeoJSON (all admin-1) → ${kb(out.states.bytes)} ${out.states.url}`,
);
