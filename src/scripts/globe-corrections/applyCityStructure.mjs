/**
 * Structural fixes to cities.ts: duplicate ids and a duplicated genre.
 *
 * Four entries collided. Every lookup in the app is `CITIES.find(c => c.id ===
 * ...)` (DetailsCard, RegionTimeline, describeStop, resolvePlaceFly,
 * guidedTours) or a first-match-wins name match (resolveEventRegion), so the
 * second entry of each pair was unreachable data — and in one case actively
 * wrong: clicking the St. John's ANTIGUA hex opened St. John's, Newfoundland,
 * and getEventsForLocation mixed both countries' events under one id.
 *
 * Usage: node src/scripts/globe-corrections/applyCityStructure.mjs [--dry-run]
 */
import fs from 'node:fs';
import path from 'node:path';

const CITIES = path.join(process.cwd(), 'src/components/atlas/data/cities.ts');
const DRY = process.argv.includes('--dry-run');
let src = fs.readFileSync(CITIES, 'utf8');
const log = [];

/** Byte range of the Nth object literal whose body contains `id: '<id>'`. */
function objectRange(id, occurrence = 0) {
  let from = 0;
  for (let n = 0; ; n++) {
    const at = src.indexOf(`id: '${id}',`, from);
    if (at === -1) return null;
    from = at + 1;
    if (n < occurrence) continue;
    const open = src.lastIndexOf('{', at);
    let depth = 0;
    for (let i = open; i < src.length; i++) {
      if (src[i] === '{') depth++;
      else if (src[i] === '}') {
        depth--;
        if (depth === 0) {
          const lineStart = src.lastIndexOf('\n', open) + 1;
          let end = i + 1;
          if (src[end] === ',') end++;
          if (src[end] === '\n') end++;
          return { start: lineStart, end };
        }
      }
    }
    return null;
  }
}

function removeEntry(id, occurrence, why) {
  const range = objectRange(id, occurrence);
  if (!range) {
    log.push(`SKIP remove ${id}#${occurrence}: not found`);
    return;
  }
  src = src.slice(0, range.start) + src.slice(range.end);
  log.push(`removed ${id} (#${occurrence}) — ${why}`);
}

/** Replace `key: <value>` inside the object that declares `id: '<id>'`. */
function setField(id, occurrence, key, value, why) {
  const range = objectRange(id, occurrence);
  if (!range) {
    log.push(`SKIP set ${id}.${key}: not found`);
    return;
  }
  const body = src.slice(range.start, range.end);
  const re = new RegExp(
    `(\\n\\s*${key}: )(?:'[^']*'|"[^"]*"|\\[[^\\]]*\\])(,)`,
  );
  if (!re.test(body)) {
    log.push(`SKIP set ${id}.${key}: key not present`);
    return;
  }
  src =
    src.slice(0, range.start) +
    body.replace(re, `$1${value}$2`) +
    src.slice(range.end);
  log.push(`${id}.${key} = ${value} — ${why}`);
}

// 1. St. Louis appears twice at identical coordinates. Keep the first (the one
//    every lookup already returns) and carry over the genre the second added.
setField(
  'st-louis',
  0,
  'genres',
  "['Ragtime', 'Blues', 'Rock & Roll', 'Hip Hop']",
  "fold in the duplicate entry's genre",
);
removeEntry('st-louis', 1, 'duplicate id, identical coordinates');

// 2. Kansas City is duplicated under a second id at the same coordinates, so it
//    never received an event (all three go to `kansas-city`).
removeEntry(
  'kansas-city-mo',
  0,
  'same city, coordinates and country as kansas-city',
);

// 3. Santo Domingo: keep the Caribbean-consistent entry, give it the right
//    district (it was carrying Port-au-Prince's "Ouest"), drop the duplicate
//    that also had the wrong region.
setField(
  'santo-domingo',
  0,
  'subdivision',
  "'Distrito Nacional'",
  "was Port-au-Prince's Ouest",
);
removeEntry(
  'santo-domingo',
  1,
  'duplicate id; its region contradicted every other Caribbean entry',
);

// 4. Two different countries shared the id `st-johns`. Antigua's gets its own.
setField(
  'st-johns',
  1,
  'id',
  "'st-johns-antigua'",
  "id collided with St. John's, Newfoundland",
);
setField(
  'st-johns-antigua',
  0,
  'subdivision',
  "'Saint John'",
  'the city is in Saint John parish',
);

// 5. Duplicate genre chip.
setField(
  'washington-dc',
  0,
  'genres',
  "['Go-Go', 'Hardcore Punk']",
  "'Go-Go' was listed twice",
);

if (!DRY) fs.writeFileSync(CITIES, src);
console.log(DRY ? '[dry-run]' : '[applied]');
for (const line of log) console.log('  ' + line);
