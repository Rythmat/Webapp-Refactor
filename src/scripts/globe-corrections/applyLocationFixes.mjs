/**
 * Move events that were pinned to the wrong place.
 *
 * These are events whose own title or description names a different city than
 * the pin — Shostakovich's Fifth premiered in Leningrad, not Moscow; Stockhausen
 * worked at the WDR studio in Cologne, not Düsseldorf; the Palomar Ballroom
 * night that broke swing was in Los Angeles; Rosalía's El Mal Querer is
 * Barcelona, not San Juan. Every entry here was confirmed by two independent
 * reviewers.
 *
 * Ids keep their original place name for the same reason they keep their
 * original year: connections, pathways and the featured list reference them,
 * and users never see them. Where a rename would be desirable it is recorded in
 * docs/globe-review/event-corrections.md instead.
 *
 * Usage: node src/scripts/globe-corrections/applyLocationFixes.mjs [--dry-run]
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const EVENTS_DIR = path.join(ROOT, 'src/components/atlas/data/events');
const DRY = process.argv.includes('--dry-run');
const patch = JSON.parse(
  fs.readFileSync(
    path.join(import.meta.dirname, 'location-patch.json'),
    'utf8',
  ),
);

const files = new Map();
const read = (p) => {
  if (!files.has(p)) files.set(p, fs.readFileSync(p, 'utf8'));
  return files.get(p);
};
const eventFiles = fs
  .readdirSync(EVENTS_DIR)
  .filter((f) => f.endsWith('.ts') && f !== 'index.ts')
  .map((f) => path.join(EVENTS_DIR, f));

const applied = [];
const alreadyCorrect = [];
const missing = [];

for (const entry of patch) {
  let done = false;
  for (const file of eventFiles) {
    const src = read(file);
    const idAt = src.indexOf(`id: '${entry.id}',`);
    if (idAt === -1) continue;

    // `location` is a short object literal a couple of lines below the id; it
    // is written inline when it fits and wrapped when it does not.
    const window = src.slice(idAt, idAt + 700);
    const locMatch = /location: \{[\s\S]*?\},/.exec(window);
    if (!locMatch) break;

    let block = locMatch[0];
    const before = block;
    block = block
      .replace(/lat: -?\d+(?:\.\d+)?/, `lat: ${entry.lat}`)
      .replace(/lng: -?\d+(?:\.\d+)?/, `lng: ${entry.lng}`)
      .replace(/city: (?:'[^']*'|"[^"]*")/, `city: '${entry.city}'`);
    if (entry.country) {
      block = block.replace(
        /country: (?:'[^']*'|"[^"]*")/,
        `country: '${entry.country}'`,
      );
    }
    if (block === before) {
      alreadyCorrect.push(entry.id);
      done = true;
      break;
    }

    const at = idAt + locMatch.index;
    files.set(
      file,
      src.slice(0, at) + block + src.slice(at + locMatch[0].length),
    );
    applied.push(
      `${entry.id} -> ${entry.city}${entry.country ? `, ${entry.country}` : ''} (${entry.lat}, ${entry.lng})`,
    );
    done = true;
    break;
  }
  if (!done) missing.push(entry.id);
}

if (!DRY) for (const [p, content] of files) fs.writeFileSync(p, content);

console.log(
  `${DRY ? '[dry-run] ' : ''}relocated: ${applied.length}, not applied: ${missing.length}`,
);
for (const line of applied) console.log('  ' + line);
if (missing.length) console.log('  MISSING:', missing.join(', '));
