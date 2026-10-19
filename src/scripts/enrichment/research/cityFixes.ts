/**
 * The hometown recheck (cityBrief.md) → a replace plan for the push.
 *
 *   npx tsx src/scripts/enrichment/research/cityFixes.ts
 *
 * Reads `_work/cityfix/city-*.json` and `_work/city-written.json` (the City
 * this job wrote for each artist), and writes `_work/city-plan.json`:
 * `{ fills: [slug, 'basedInPlaceId', id][], expect: { slug: written | null },
 *    places }`. The page replaces a City only while the store still holds
 * `expect` (what this job wrote, or empty), so an owner's own edit is never
 * overwritten. Proposed places resolve to one of ours, or to one this job
 * already made, before a new one is planned. A borough rolls up to its city.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CITIES } from '@/components/atlas/data/cities';
import { closeEnough, sameName } from '@/content/linking/samePlace';
import { createPlaceBook } from '../import/placeMap';
import { PART_OF_CITY, readJson, WORK_DIR, writeJson } from './shared';

const PLACES_JSON = fileURLToPath(
  new URL('../../../content/data/places.json', import.meta.url),
);

interface Known {
  id: string;
  name: string;
  country: string;
  coordinates: [number, number];
}

const known: Known[] = [
  ...CITIES.map((c) => ({
    id: c.id,
    name: c.name,
    country: c.country,
    coordinates: c.coordinates as [number, number],
  })),
  ...(JSON.parse(readFileSync(PLACES_JSON, 'utf8')) as Known[]),
];
// Places this job already made in the store (the push plans' places).
for (const file of readdirSync(WORK_DIR).filter((f) =>
  /^(push-\d+|pilot-plan)\.json$/.test(f),
))
  for (const p of readJson<{ places: Known[] }>(join(WORK_DIR, file)).places ??
    [])
    if (!known.some((k) => k.id === p.id)) known.push(p);

const written = readJson<Record<string, string>>(
  join(WORK_DIR, 'city-written.json'),
);
const book = createPlaceBook({ reserved: new Set(known.map((k) => k.id)) });

const dir = join(WORK_DIR, 'cityfix');
const fills: [string, 'basedInPlaceId', string][] = [];
const expect: Record<string, string | null> = {};
const problems: string[] = [];
for (const file of existsSync(dir)
  ? readdirSync(dir)
      .filter((f) => f.endsWith('.json'))
      .sort()
  : []) {
  const batch = readJson<{
    fills: { slug: string; value: unknown }[];
  }>(join(dir, file));
  for (const f of batch.fills) {
    let id: string | null = null;
    if (typeof f.value === 'string') id = f.value;
    else if (f.value && typeof f.value === 'object' && 'newPlace' in f.value) {
      const { name, country, lat, lng } = (
        f.value as {
          newPlace: { name: string; country: string; lat: number; lng: number };
        }
      ).newPlace;
      const coordinates: [number, number] = [lat, lng];
      const mine = known.find(
        (k) =>
          sameName(k.name, name) &&
          closeEnough(
            { country: k.country, coordinates: k.coordinates },
            { country, coordinates },
          ),
      );
      if (mine) id = mine.id;
      else {
        const match = book.place({ name, country, coordinates });
        if (match.kind === 'none') problems.push(`${f.slug}: ${match.reason}`);
        else id = match.placeId;
      }
    }
    if (!id) continue;
    id = PART_OF_CITY[id] ?? id;
    if (
      !known.some((k) => k.id === id) &&
      !book.created().some((p) => p.slug === id)
    ) {
      problems.push(`${f.slug}: unknown place ${id}`);
      continue;
    }
    if (written[f.slug] === id) continue; // confirmed as written
    fills.push([f.slug, 'basedInPlaceId', id]);
    expect[f.slug] = written[f.slug] ?? null;
  }
}
const used = new Set(fills.map((f) => f[2]));
const places = book
  .created()
  .filter((p) => used.has(p.slug))
  .map((p) => p.body);
writeJson(join(WORK_DIR, 'city-plan.json'), { fills, expect, places });
console.log(
  `${fills.length} City changes or new Cities, ${places.length} new places.`,
);
if (problems.length) console.log(`problems:\n  ${problems.join('\n  ')}`);
