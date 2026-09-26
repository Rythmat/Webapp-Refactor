/**
 * Apply the reviewed year corrections to the bundled globe data.
 *
 * Input: year-patch.json — { id, kind, newYear } per entry, produced from the
 * 2026-09 globe data review (every entry double-verified by two independent
 * reviewers before it got here).
 *
 * Event ids embed their original year (evt-blues-rochester-1965). Ids are NOT
 * renamed: they are referenced by eventConnections.ts, historicalModules.ts,
 * guidedTours.ts and GlobeSection's featured list, and they are never shown to
 * a user. Only the `year` field moves.
 *
 * Song years live in two places — the derived globe event in
 * events/songLibrary.ts and the song record in curriculum/data/songs/<slug>.ts
 * (which the API's derivation reads). Both are updated.
 *
 * Usage: node src/scripts/globe-corrections/applyYearFixes.mjs [--dry-run]
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const EVENTS_DIR = path.join(ROOT, 'src/components/atlas/data/events');
const SONGS_DIR = path.join(ROOT, 'src/curriculum/data/songs');
const PATCH = path.join(import.meta.dirname, 'year-patch.json');

const DRY = process.argv.includes('--dry-run');
const patch = JSON.parse(fs.readFileSync(PATCH, 'utf8'));

const files = new Map();
const read = (p) => {
  if (!files.has(p)) files.set(p, fs.readFileSync(p, 'utf8'));
  return files.get(p);
};

/** Replace `year: N` in the object literal opened by `id: '<id>'`. */
function setYear(filePath, id, newYear) {
  const src = read(filePath);
  const idAt = src.indexOf(`id: '${id}',`);
  if (idAt === -1) return null;
  // `year` is always the next key after `id` in these files; bound the search
  // so a malformed record can never reach into the following object.
  const window = src.slice(idAt, idAt + 200);
  const m = /\n(\s*)year: (\d{3,4}),/.exec(window);
  if (!m) return null;
  const oldYear = Number(m[2]);
  if (oldYear === newYear) return { oldYear, changed: false };
  const at = idAt + m.index;
  files.set(
    filePath,
    src.slice(0, at) +
      `\n${m[1]}year: ${newYear},` +
      src.slice(at + m[0].length),
  );
  return { oldYear, changed: true };
}

const eventFiles = fs
  .readdirSync(EVENTS_DIR)
  .filter((f) => f.endsWith('.ts') && f !== 'index.ts')
  .map((f) => path.join(EVENTS_DIR, f));

const report = { events: [], songs: [], alreadyCorrect: [], missing: [] };

for (const entry of patch) {
  let done = false;
  for (const file of eventFiles) {
    const result = setYear(file, entry.id, entry.newYear);
    if (result) {
      if (result.changed) {
        report[entry.kind === 'song' ? 'songs' : 'events'].push({
          id: entry.id,
          from: result.oldYear,
          to: entry.newYear,
          file: path.relative(ROOT, file),
        });
      } else {
        report.alreadyCorrect.push(entry.id);
      }
      done = true;
      break;
    }
  }

  // Song records carry the same year for the API's derivation.
  if (entry.kind === 'song') {
    const slug = entry.id.replace(/^song-/, '');
    const songFile = path.join(SONGS_DIR, `${slug}.ts`);
    if (fs.existsSync(songFile)) {
      const src = read(songFile);
      const m = /\n(\s*)year: (\d{3,4}),/.exec(src);
      if (m && Number(m[2]) !== entry.newYear) {
        files.set(
          songFile,
          src.slice(0, m.index) +
            `\n${m[1]}year: ${entry.newYear},` +
            src.slice(m.index + m[0].length),
        );
      }
    }
  }

  if (!done) report.missing.push(entry.id);
}

if (!DRY) {
  for (const [p, content] of files) fs.writeFileSync(p, content);
}

console.log(
  `${DRY ? '[dry-run] ' : ''}events changed: ${report.events.length}, songs changed: ${report.songs.length}, already correct: ${report.alreadyCorrect.length}, not found: ${report.missing.length}`,
);
if (report.missing.length) console.log('  missing:', report.missing.join(', '));
console.log(`files touched: ${files.size}`);
