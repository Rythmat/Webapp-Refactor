/**
 * Walks every `chordName: '...'` string in the song catalog and runs each
 * through the same alias-based resolution that `chordParser.ts` uses.
 * Reports any chord names the parser does NOT recognize, so the alias map
 * can be expanded or song data corrected.
 *
 * Run: node src/scripts/auditChordParser.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SONGS_DIR = path.resolve(__dirname, '../curriculum/data/songs');

// ── Mirror of chordParser.ts (kept in sync by hand) ───────────────────
const ROOT_TO_PC = {
  C: 0,
  'C♯': 1,
  'D♭': 1,
  D: 2,
  'D♯': 3,
  'E♭': 3,
  E: 4,
  'E♯': 5,
  'F♭': 4,
  F: 5,
  'F♯': 6,
  'G♭': 6,
  G: 7,
  'G♯': 8,
  'A♭': 8,
  A: 9,
  'A♯': 10,
  'B♭': 10,
  B: 11,
  'B♯': 0,
  'C♭': 11,
};

const SURFACE_TO_ID = {
  '': 1,
  maj: 1,
  M: 1,
  min: 1,
  m: 1,
  '-': 1,
  dim: 1,
  '°': 1,
  o: 1,
  aug: 1,
  '+': 1,
  sus: 1,
  sus4: 1,
  sus2: 1,
  5: 1,
  power: 1,
  7: 1,
  maj7: 1,
  M7: 1,
  '∆7': 1,
  '∆': 1,
  min7: 1,
  m7: 1,
  '-7': 1,
  dim7: 1,
  '°7': 1,
  '7sus': 1,
  '7sus4': 1,
  sus7: 1,
  '7sus2': 1,
  maj7sus4: 1,
  maj7sus2: 1,
  min7b5: 1,
  'min7♭5': 1,
  m7b5: 1,
  'm7♭5': 1,
  ø: 1,
  ø7: 1,
  'min(maj7)': 1,
  'm(maj7)': 1,
  mMaj7: 1,
  minMaj7: 1,
  6: 1,
  maj6: 1,
  M6: 1,
  min6: 1,
  m6: 1,
  add2: 1,
  add9: 1,
  add4: 1,
  9: 1,
  maj9: 1,
  M9: 1,
  min9: 1,
  m9: 1,
  11: 1,
  min11: 1,
  m11: 1,
  13: 1,
  min13: 1,
  m13: 1,
  maj13: 1,
  M13: 1,
  '7b9': 1,
  '7♭9': 1,
  '7#9': 1,
  '7♯9': 1,
  '7b5': 1,
  '7♭5': 1,
  '7#5': 1,
  '7♯5': 1,
  '7aug': 1,
  aug7: 1,
  '7alt': 1,
  alt7: 1,
  '7altered': 1,
  '7#11': 1,
  '7♯11': 1,
  'maj7#11': 1,
  'maj7♯11': 1,
  '♯5': 1,
  '♭5': 1,
};

function resolve(chordName) {
  if (!chordName) return { ok: false, reason: 'empty' };
  const trimmed = chordName.trim();
  if (/^N\.?C\.?$/i.test(trimmed)) return { ok: true, normalized: 'N.C.' };
  const rootMatch = trimmed.match(/^([A-G])([♭♯b#]?)/);
  if (!rootMatch) return { ok: false, reason: 'no-root' };
  const accidental =
    rootMatch[2] === 'b' ? '♭' : rootMatch[2] === '#' ? '♯' : rootMatch[2];
  const rootKey = rootMatch[1] + accidental;
  if (ROOT_TO_PC[rootKey] == null)
    return { ok: false, reason: 'unknown-root', rootKey };
  let remainder = trimmed.slice(rootMatch[0].length);
  remainder = remainder.replace(/\/[A-G][♭♯b#]?\d?(?:\([^)]*\))?$/, '').trim();
  const normalized = remainder.replace(/[()]/g, '').trim();
  if (SURFACE_TO_ID[normalized] == null) {
    return { ok: false, reason: 'unknown-quality', normalized };
  }
  return { ok: true, normalized };
}

const chordRe = /chordName:\s*['"]([^'"]+)['"]/g;
const songFiles = fs
  .readdirSync(SONGS_DIR)
  .filter(
    (f) => f.endsWith('.ts') && !f.startsWith('_') && !f.startsWith('index'),
  );

const seen = new Map(); // chordName → { count, files: Set }
for (const file of songFiles) {
  const content = fs.readFileSync(path.join(SONGS_DIR, file), 'utf-8');
  let m;
  while ((m = chordRe.exec(content)) != null) {
    const name = m[1];
    if (!seen.has(name)) seen.set(name, { count: 0, files: new Set() });
    const entry = seen.get(name);
    entry.count++;
    entry.files.add(file);
  }
}

const unrecognized = [];
let recognizedNames = 0;
let totalNames = 0;
for (const [name, info] of seen) {
  totalNames++;
  const r = resolve(name);
  if (!r.ok)
    unrecognized.push({
      name,
      info,
      reason: r.reason,
      normalized: r.normalized,
    });
  else recognizedNames++;
}

console.log(
  `Catalog: ${songFiles.length} songs, ${seen.size} unique chord names.`,
);
console.log(`Recognized: ${recognizedNames} / ${seen.size} unique.`);
const totalOcc = [...seen.values()].reduce((a, b) => a + b.count, 0);
const unrecOcc = unrecognized.reduce((a, b) => a + b.info.count, 0);
console.log(
  `Coverage: ${(((totalOcc - unrecOcc) / totalOcc) * 100).toFixed(2)}% of ${totalOcc} chord occurrences.`,
);

if (unrecognized.length === 0) {
  console.log('\nAll chord names resolve. ✓');
} else {
  console.log(`\nUnrecognized (${unrecognized.length}):`);
  unrecognized.sort((a, b) => b.info.count - a.info.count);
  for (const u of unrecognized) {
    const sample = [...u.info.files].slice(0, 2).join(', ');
    console.log(
      `  ${String(u.info.count).padStart(5)}× ${JSON.stringify(u.name).padEnd(20)} reason=${u.reason} normalized=${JSON.stringify(u.normalized ?? '')}  e.g. ${sample}`,
    );
  }
}
