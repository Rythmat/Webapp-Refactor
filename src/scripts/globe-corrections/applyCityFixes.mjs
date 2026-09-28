/**
 * Apply the reviewed corrections to src/components/atlas/data/cities.ts.
 *
 * The big one is the `subdivision` off-by-one. From `conakry` to `paramaribo`
 * (with a few later-inserted correct blocks in between) every city carried the
 * PREVIOUS entry's subdivision — Bissau read "Conakry", Athens read "Chișinău",
 * Kyiv read "Ljubljana". 153 entries. Confirmed independently by walking the
 * array: shifting each value back one position recovers the real division for
 * the cases where it is not simply the city's own name (Freetown → Western
 * Area, Monrovia → Montserrado, Malabo → Bioko Norte).
 *
 * Subdivision is display-only outside the US and Canada (globe search
 * subtitles, the timeline header, describeStop), so this is a visible-copy fix
 * rather than a routing one — but the routing fix for same-name US cities rides
 * along in resolveEventRegion.ts.
 *
 * Every edit is guarded on the value it expects to replace, so a rerun (or a
 * file that has drifted) reports instead of corrupting.
 *
 * Usage: node src/scripts/globe-corrections/applyCityFixes.mjs [--dry-run]
 */
import fs from 'node:fs';
import path from 'node:path';

const CITIES = path.join(process.cwd(), 'src/components/atlas/data/cities.ts');
const PATCH = path.join(import.meta.dirname, 'subdivision-patch.json');
const DRY = process.argv.includes('--dry-run');

let src = fs.readFileSync(CITIES, 'utf8');
const patch = JSON.parse(fs.readFileSync(PATCH, 'utf8'));

const applied = [];
const skipped = [];

for (const { id, from, to } of patch) {
  const idAt = src.indexOf(`id: '${id}',`);
  if (idAt === -1) {
    skipped.push(`${id}: no such entry`);
    continue;
  }
  // The subdivision key sits a few lines below the id inside the same literal.
  const window = src.slice(idAt, idAt + 400);
  // The file quotes with ' normally and with " when the value has an
  // apostrophe (São Tomé's stored "N'Djamena"), so accept either.
  const m = /\n(\s*)subdivision: (?:'([^']*)'|"([^"]*)"),/.exec(window);
  if (!m) {
    skipped.push(`${id}: no subdivision key`);
    continue;
  }
  const current = m[2] ?? m[3];
  if (current === to) continue; // already correct
  if (current !== from) {
    skipped.push(`${id}: expected '${from}', found '${current}'`);
    continue;
  }
  // Match the file's quoting rule so prettier does not rewrite the line.
  const quoted = to.includes("'") ? `"${to}"` : `'${to}'`;
  const at = idAt + m.index;
  src =
    src.slice(0, at) +
    `\n${m[1]}subdivision: ${quoted},` +
    src.slice(at + m[0].length);
  applied.push(`${id}: '${from}' -> '${to}'`);
}

if (!DRY) fs.writeFileSync(CITIES, src);

console.log(
  `${DRY ? '[dry-run] ' : ''}subdivisions applied: ${applied.length}, skipped: ${skipped.length}`,
);
for (const s of skipped) console.log('  skip:', s);
