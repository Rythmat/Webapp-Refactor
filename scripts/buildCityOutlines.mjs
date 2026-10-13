#!/usr/bin/env node
/* eslint-env node */
/**
 * Build the outline of each city the Globe page can select, for it to draw
 * when the city is selected, as it outlines a selected country or state: the
 * music cities (cities.ts) and the towns events make cities of (Aspen,
 * Colorado Springs: utils/deriveEventCities.ts, run on the bundled events).
 *
 *   npx tsx scripts/buildCityOutlines.mjs            # build from the cache
 *   npx tsx scripts/buildCityOutlines.mjs --refresh  # ask OpenStreetMap again
 *   npx tsx scripts/buildCityOutlines.mjs --only=new-orleans,aspen-us  # try a
 *                                       few; writes nothing, prints them
 *
 * It runs under tsx, which reads the app's TypeScript and its path aliases.
 * Towns only published content places (not in the bundled events) have no
 * outline until the bundled events catch up and this runs again.
 *
 * Each city's boundary comes from OpenStreetMap (© OpenStreetMap
 * contributors, ODbL; the Globe's map credits it) through Nominatim's search,
 * asked once per city and cached in node_modules/.cache/build-city-outlines,
 * within Nominatim's usage policy: one request a second, an identifying user
 * agent, and nothing asked twice. Nominatim's own simplification
 * (polygon_threshold) keeps each outline to tens of metres.
 *
 * A boundary is kept only when it is the city's: it must contain the city's
 * coordinates (cities.ts), and the part containing them must be city-sized
 * (MAX_CITY_KM2), so a search that answers with a whole state is refused.
 * Many big cities are mapped as a point inside their municipality
 * (Copenhagen in Københavns Kommune, Cape Town in the City of Cape Town):
 * then the municipality named in the point's address is searched for, and
 * its boundary taken if it holds the city and is no smaller than
 * MIN_MUNICIPALITY_KM2 (a neighbourhood is not the city).
 * Far parts of a city (Tokyo's Pacific islands) are dropped. Cities with no
 * such boundary in OpenStreetMap (a town mapped as a point) get none, and the
 * Globe shows only their dot.
 *
 * Writes public/geo/cities/<id>.<hash>.json, one small GeoJSON Feature per
 * city, and src/components/atlas/data/cityOutlineFiles.ts naming them. Commit
 * everything it writes.
 */
import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { format, resolveConfig } from 'prettier';
import { CITIES as MUSIC_CITIES } from '../src/components/atlas/data/cities.ts';
import { BUNDLED_MUSIC_HISTORY } from '../src/components/atlas/data/events/index.ts';
import { STATE_BOUNDARIES } from '../src/components/atlas/data/stateBoundaries.ts';
import { deriveEventCities } from '../src/components/atlas/utils/deriveEventCities.ts';
import { stateAt } from '../src/components/atlas/utils/stateAt.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CACHE = join(ROOT, 'node_modules/.cache/build-city-outlines');
const OUT = join(ROOT, 'public/geo/cities');
const MANIFEST = join(ROOT, 'src/components/atlas/data/cityOutlineFiles.ts');

const NOMINATIM = 'https://nominatim.openstreetmap.org/search';
const USER_AGENT =
  'MusicAtlas-buildCityOutlines/1.0 (+https://musicatlas.io; one-off build)';
/** Nominatim's policy: at most one request a second. */
const REQUEST_GAP_MS = 1100;
/** Nominatim's simplification, in degrees: about 30 m. */
const POLYGON_THRESHOLD = 0.0003;
/** Coordinates are written to 4 decimals: about 11 m. */
const DECIMALS = 4;
/** Bigger than this, the boundary is a region's, not a city's. */
const MAX_CITY_KM2 = 20000;
/** A municipality searched for a city mapped as a point must be at least this. */
const MIN_MUNICIPALITY_KM2 = 10;
/**
 * The levels a municipality found that way may be at. A metropolitan
 * municipality is a "county" in Nominatim's terms (the City of Cape Town);
 * a "state_district" is too wide or not the city (Jamaica's historic Surrey
 * County round Kingston).
 */
const MUNICIPALITY_LEVELS = new Set([
  'city',
  'town',
  'village',
  'municipality',
  'county',
]);
/** Parts of a city further than this (degrees) from its main part are dropped. */
const NEAR_PART_DEG = 0.5;

/** How the dataset names a country, as Nominatim reads it. */
const COUNTRY_NAMES = { US: 'United States', UK: 'United Kingdom' };

/** Every selectable city: the music cities, then the towns events make cities of. */
const CITIES = [
  ...MUSIC_CITIES,
  ...deriveEventCities(
    BUNDLED_MUSIC_HISTORY,
    (lat, lng) => stateAt(STATE_BOUNDARIES, lat, lng)?.name,
  ).cities,
];

const refresh = process.argv.includes('--refresh');
const only = process.argv
  .find((arg) => arg.startsWith('--only='))
  ?.slice('--only='.length)
  .split(',');
const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

let lastRequest = 0;
async function search(query) {
  const wait = lastRequest + REQUEST_GAP_MS - Date.now();
  if (wait > 0) await sleep(wait);
  lastRequest = Date.now();
  const url = new URL(NOMINATIM);
  url.search = new URLSearchParams({
    q: query,
    format: 'geojson',
    polygon_geojson: '1',
    polygon_threshold: String(POLYGON_THRESHOLD),
    limit: '5',
  }).toString();
  const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return response.json();
}

/** The cached answers for a city, asking Nominatim only for what is missing. */
async function answersFor(city) {
  const file = join(CACHE, `${city.id}.json`);
  const country = COUNTRY_NAMES[city.country] ?? city.country;
  let answers = [];
  if (!refresh && existsSync(file)) {
    answers = JSON.parse(readFileSync(file, 'utf8'));
  } else {
    const queries = [
      ...new Set([
        [city.name, city.subdivision, country].filter(Boolean).join(', '),
        [city.name, country].join(', '),
      ]),
    ];
    for (const query of queries) {
      const result = await search(query);
      answers.push({ query, features: result.features ?? [] });
      // The first query is usually enough; ask the plainer one only if needed.
      if (pickBoundary(city, answers)) break;
    }
  }
  // A city mapped as a point: search for the municipality its address names.
  if (!pickBoundary(city, answers) && !answers.some((a) => a.municipality)) {
    const point = answers
      .flatMap((a) => a.features)
      .find(
        (f) =>
          f.geometry?.type === 'Point' && f.properties?.category === 'place',
      );
    const parts = (point?.properties?.display_name ?? '')
      .split(',')
      .map((part) => part.trim())
      .filter((part) => part && !/^\d/.test(part));
    // The point's own name comes first; then what it sits in, nearest first.
    for (const query of parts.slice(1, 4).map((p) => `${p}, ${country}`)) {
      const result = await search(query);
      answers.push({
        query,
        features: result.features ?? [],
        municipality: true,
      });
      if (pickBoundary(city, answers)) break;
    }
    if (!answers.some((a) => a.municipality)) {
      answers.push({
        query: '(no address to search)',
        features: [],
        municipality: true,
      });
    }
  }
  mkdirSync(CACHE, { recursive: true });
  writeFileSync(file, JSON.stringify(answers));
  return answers;
}

/* ── Geometry ───────────────────────────────────────────────────────────── */

const polygonsOf = (geometry) =>
  geometry?.type === 'Polygon'
    ? [geometry.coordinates]
    : geometry?.type === 'MultiPolygon'
      ? geometry.coordinates
      : [];

function inRing(lng, lat, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (
      yi > lat !== yj > lat &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi
    ) {
      inside = !inside;
    }
  }
  return inside;
}

/** A polygon's outer ring area in km² (equirectangular; fine at city size). */
function ringKm2(ring) {
  const lat0 =
    (ring.reduce((s, [, lat]) => s + lat, 0) / ring.length) * (Math.PI / 180);
  const kx = 111.32 * Math.cos(lat0);
  const ky = 110.57;
  let twice = 0;
  for (let i = 0; i < ring.length; i++) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[(i + 1) % ring.length];
    twice += x1 * kx * (y2 * ky) - x2 * kx * (y1 * ky);
  }
  return Math.abs(twice) / 2;
}

function ringBox(ring) {
  const xs = ring.map((p) => p[0]);
  const ys = ring.map((p) => p[1]);
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
}

const boxGap = (a, b) =>
  Math.hypot(
    Math.max(0, b[0] - a[2], a[0] - b[2]),
    Math.max(0, b[1] - a[3], a[1] - b[3]),
  );

/**
 * The city's boundary among Nominatim's answers: a polygon whose part
 * containing the city is city-sized, with its far parts dropped. Null when
 * none qualifies.
 */
function pickBoundary(city, answers) {
  const [lat, lng] = city.coordinates;
  for (const { features, municipality } of answers) {
    for (const feature of features) {
      const polygons = polygonsOf(feature.geometry);
      const main = polygons.find((polygon) => inRing(lng, lat, polygon[0]));
      if (!main) continue;
      const km2 = ringKm2(main[0]);
      if (km2 > MAX_CITY_KM2) continue;
      if (
        municipality &&
        (km2 < MIN_MUNICIPALITY_KM2 ||
          !MUNICIPALITY_LEVELS.has(feature.properties?.addresstype))
      ) {
        continue;
      }
      const mainBox = ringBox(main[0]);
      const kept = polygons.filter(
        (polygon) =>
          polygon === main ||
          boxGap(mainBox, ringBox(polygon[0])) <= NEAR_PART_DEG,
      );
      return {
        km2,
        osm: `${feature.properties?.osm_type}/${feature.properties?.osm_id}`,
        name: feature.properties?.display_name,
        geometry:
          kept.length === 1
            ? { type: 'Polygon', coordinates: kept[0] }
            : { type: 'MultiPolygon', coordinates: kept },
      };
    }
  }
  return null;
}

const round = (geometry) => {
  const r = (c) =>
    typeof c[0] === 'number'
      ? c.map((v) => Math.round(v * 10 ** DECIMALS) / 10 ** DECIMALS)
      : c.map(r);
  return { ...geometry, coordinates: r(geometry.coordinates) };
};

/* ── Build ──────────────────────────────────────────────────────────────── */

const found = [];
const missing = [];
const cities = only ? CITIES.filter((c) => only.includes(c.id)) : CITIES;
for (const [i, city] of cities.entries()) {
  const answers = await answersFor(city);
  const boundary = pickBoundary(city, answers);
  if (boundary) found.push({ city, boundary });
  else missing.push(city);
  if ((i + 1) % 25 === 0) {
    console.log(`build-city-outlines: ${i + 1} of ${cities.length}`);
  }
}

if (only) {
  for (const { city, boundary } of found) {
    console.log(
      `${city.id}: ${boundary.osm} ${Math.round(boundary.km2)} km², ${JSON.stringify(boundary.geometry).length} bytes — ${boundary.name}`,
    );
  }
  for (const city of missing) console.log(`${city.id}: none`);
  process.exit(0);
}

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
const files = {};
let bytes = 0;
for (const { city, boundary } of found) {
  const json = JSON.stringify({
    type: 'Feature',
    properties: { id: city.id, name: city.name, osm: boundary.osm },
    geometry: round(boundary.geometry),
  });
  const hash = createHash('sha256').update(json).digest('hex').slice(0, 10);
  const file = `${city.id}.${hash}.json`;
  writeFileSync(join(OUT, file), json);
  files[city.id] = `/geo/cities/${file}`;
  bytes += Buffer.byteLength(json);
}

const manifest = `// GENERATED by scripts/buildCityOutlines.mjs. Do not edit; re-run the script.

/**
 * Each music city's outline (© OpenStreetMap contributors, ODbL), served
 * from public/geo/cities/ as one GeoJSON Feature, by city id. A city missing
 * here has no boundary in OpenStreetMap that is its own. ${found.length} of
 * ${CITIES.length} cities, ${bytes} bytes in all.
 */
export const CITY_OUTLINE_FILES: Readonly<Record<string, string>> = ${JSON.stringify(files, null, 2)};
`;
// In the repo's own style, so the lint's formatting check passes as written.
writeFileSync(
  MANIFEST,
  await format(manifest, {
    ...((await resolveConfig(MANIFEST)) ?? {}),
    filepath: MANIFEST,
  }),
);

const kb = (n) => `${(n / 1000).toFixed(1)} kB`;
console.log(
  `build-city-outlines: ${found.length} of ${CITIES.length} cities outlined, ${kb(bytes)} in all (largest ${kb(Math.max(...found.map(({ boundary }) => JSON.stringify(boundary.geometry).length)))})`,
);
if (missing.length) {
  console.log(
    `build-city-outlines: no city boundary for ${missing.map((c) => c.id).join(', ')}`,
  );
}
