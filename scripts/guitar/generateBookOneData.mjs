#!/usr/bin/env node
/**
 * One-time generator for the Guitar Atlas Book One data files.
 *
 *   node scripts/guitar/generateBookOneData.mjs && npx prettier --write src/curriculum/data/guitar/bookOne
 *
 * Reads the verified page-by-page extraction of the book
 * (src/curriculum/data/guitar/__fixtures__/bookOne.extraction.json), applies
 * the corrections listed in src/curriculum/data/guitar/bookOneErrata.ts, and
 * writes one typed file per key to src/curriculum/data/guitar/bookOne/.
 *
 * It is kept for provenance. After the first run the generated .ts files are
 * the source of truth; bookOne.integrity.test.ts compares them to the fixture
 * and requires every difference to cite an erratum.
 *
 * Plain .mjs with node: imports only — the scripts/ tsconfig has no DOM and no
 * `@/` aliases, so it cannot import the app's TypeScript.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const FIXTURE = join(
  ROOT,
  'src/curriculum/data/guitar/__fixtures__/bookOne.extraction.json',
);
const OUT_DIR = join(ROOT, 'src/curriculum/data/guitar/bookOne');

const KEY_ORDER = [
  'C',
  'G',
  'D',
  'A',
  'E',
  'B',
  'F#',
  'Db',
  'Ab',
  'Eb',
  'Bb',
  'F',
];
const FILE_NAME = { 'F#': 'Fsharp' };
const DISPLAY = { 'F#': 'F♯', Db: 'D♭', Ab: 'A♭', Eb: 'E♭', Bb: 'B♭' };
const TUNING = { 1: 64, 2: 59, 3: 55, 4: 50, 5: 45, 6: 40 };

// ── Corrections (ids match bookOneErrata.ts) ─────────────────────────────

/** Chord-page boxes, keyed `<key>/<triads|sevenths>/<printed index>`. */
const SHAPE_FIXES = {
  'Ab/sevenths/6': {
    erratumIds: ['Ab-7th-6-fm7-shape'],
    frets: 'X-8-10-8-9-X',
    diagramStartFret: 7,
    barre: { fret: 8, fromString: 5, toString: 3, finger: 1 },
    fingering: [
      [1, 5, 8],
      [1, 3, 8],
      [2, 2, 9],
      [3, 4, 10],
    ],
  },
  'Bb/triads/2': {
    erratumIds: ['Bb-triad-2-cm-shape'],
    copyFrom: 'Ab/triads/3',
  },
  'Eb/triads/6': {
    erratumIds: ['Eb-triad-6-cm-shape'],
    copyFrom: 'Ab/triads/3',
  },
  'C/triads/5': {
    erratumIds: ['C-triad-5-g-fingering'],
    fingeringFrom: 'G/triads/1',
  },
  'G/triads/2': {
    erratumIds: ['G-triad-2-am-fingering'],
    fingeringFrom: 'C/triads/6',
  },
  'E/triads/1': {
    erratumIds: ['E-triad-1-e-fingering'],
    fingeringFrom: 'A/triads/5',
  },
  'E/triads/3': {
    erratumIds: ['E-triad-3-gsm-barre'],
    barre: { fret: 4, fromString: 6, toString: 3, finger: 1 },
  },
  'B/triads/6': {
    erratumIds: ['B-triad-6-gsm-barre'],
    barre: { fret: 4, fromString: 6, toString: 3, finger: 1 },
  },
  'G/sevenths/8': { erratumIds: ['G-7th-8-caption'] },
  'Db/triads/4': { erratumIds: ['Db-triad-4-caption'] },
  'Db/sevenths/8': { erratumIds: ['Db-7th-8-octave'], notOctave: true },
  'Eb/sevenths/8': { erratumIds: ['Eb-7th-8-octave'], notOctave: true },
};

/** Music Maps, keyed `<key>/<example>`; bar indexes are 0-based. */
const MAP_FIXES = {
  'Db/1': {
    erratumIds: ['Db-map-1-fret-labels'],
    barFrets: ['X-4-6-6-6-X'],
  },
  'Db/2': {
    erratumIds: ['Db-map-2-fret-labels'],
    barFrets: ['X-4-6-6-6-X', '2-4-4-3-X-X'],
    barErrata: { 1: ['Db-map-2-bar-2-dot'] },
  },
  'Db/3': {
    erratumIds: ['Db-map-3-fret-labels'],
    barFrets: ['X-6-8-8-7-X', 'X-4-6-6-6-X'],
  },
  'Eb/3': {
    erratumIds: ['Eb-map-3-fret-labels'],
    barFrets: ['X-8-10-10-9-X', '8-10-10-8-X-X'],
  },
  'A/3': { barErrata: { 1: ['A-map-3-bar-2-name'] } },
  'A/4': { barErrata: { 3: ['A-map-4-bar-4-name'] } },
  'E/5': { barErrata: { 1: ['E-map-5-bar-2-name'] } },
  'Ab/5': { barErrata: { 2: ['Ab-map-5-bar-3-name'] } },
};

const EXAMPLE_5_ERRATUM = 'ALL-map-5-label';

// ── Helpers ──────────────────────────────────────────────────────────────

function shapeString(frets) {
  return frets
    .map((f) => (f === 'X' || f === 'x' ? 'X' : String(Number(f))))
    .join('-');
}

function parseBarre(text) {
  const m = /^fret (\d+), strings (\d)-(\d)[^,]*, (index|ring)/.exec(text);
  if (!m) return undefined;
  return {
    fret: Number(m[1]),
    fromString: Number(m[2]),
    toString: Number(m[3]),
    finger: m[4] === 'index' ? 1 : 3,
  };
}

function fingering(list) {
  return [...list]
    .map((f) =>
      Array.isArray(f)
        ? { finger: f[0], string: f[1], fret: f[2] }
        : { finger: f.finger, string: f.string, fret: f.fret },
    )
    .sort((a, b) => b.string - a.string || a.finger - b.finger);
}

function defaultDiagramStart(frets) {
  const fretted = frets
    .split('-')
    .filter((f) => f !== 'X')
    .map(Number)
    .filter((f) => f > 0);
  if (fretted.length === 0 || Math.max(...fretted) <= 5) return 1;
  return Math.max(1, Math.min(...fretted) - 1);
}

function parseDegreeQuality(cell) {
  const text = cell.replace(/\s+/g, '').replace('♭', 'b');
  const m = /^(\d)(maj7|min7|dom7|maj|min)(\(b5\))?$/.exec(text);
  if (!m) throw new Error(`Unreadable progression cell "${cell}"`);
  const quality = m[3] ? 'min7b5' : m[2];
  return { degree: Number(m[1]), quality };
}

function midi(string, fret) {
  return TUNING[string] + fret;
}

function scalePosition(id, raw) {
  const playOrder = [...raw.dots]
    .sort((a, b) => midi(a.string, a.fret) - midi(b.string, b.fret))
    .map((d) => ({ string: d.string, fret: d.fret }));
  return {
    id,
    fretStart: raw.fretStart,
    fretEnd: raw.fretEnd,
    unusedStrings: raw.unusedStrings,
    playOrder,
  };
}

// ── Build ────────────────────────────────────────────────────────────────

const fixture = JSON.parse(readFileSync(FIXTURE, 'utf8'));
const byKey = Object.fromEntries(
  fixture.keys.map((k) => [k.key.replace(/ Major$/, ''), k]),
);

function rawShape(ref) {
  const [key, kind, index] = ref.split('/');
  return byKey[key][kind][Number(index) - 1];
}

function buildShape(key, kind, raw) {
  const ref = `${key}/${kind}/${raw.index}`;
  const fix = SHAPE_FIXES[ref] ?? {};
  const source = fix.copyFrom ? rawShape(fix.copyFrom) : raw;
  const shape = {
    degree: raw.index,
    quality: raw.quality,
    frets: fix.frets ?? shapeString(source.frets),
    diagramStartFret: fix.diagramStartFret ?? source.diagramStartFret,
    fingering: fingering(
      fix.fingering ??
        (fix.fingeringFrom
          ? rawShape(fix.fingeringFrom).fingering
          : source.fingering),
    ),
  };
  const barre = fix.barre ?? (fix.frets ? undefined : parseBarre(source.barre));
  if (barre) shape.barre = barre;
  // The eighth 7th-chord box repeats degree 1.
  if (kind === 'sevenths' && shape.degree === 8) shape.degree = 1;
  if (kind === 'sevenths' && raw.isOctaveRepeat && !fix.notOctave) {
    shape.isOctaveRepeat = true;
  }
  if (fix.erratumIds) shape.erratumIds = fix.erratumIds;
  return shape;
}

function buildKey(key) {
  const raw = byKey[key];
  const [first, last] = raw.pdfPages.match(/\d+/g).map(Number);

  const triads = raw.triads.map((t) => buildShape(key, 'triads', t));
  const sevenths = raw.sevenths.map((s, i) =>
    buildShape(key, 'sevenths', { ...s, index: i + 1 }),
  );

  // Any chord-page box, in any key, that draws the same voicing — so map bars
  // can reuse the book's own fingering for it.
  const pageShapes = KEY_ORDER.flatMap((k) =>
    [...byKey[k].triads, ...byKey[k].sevenths].map((s, i) =>
      buildShape(
        k,
        i < byKey[k].triads.length ? 'triads' : 'sevenths',
        i < byKey[k].triads.length
          ? s
          : { ...s, index: i - byKey[k].triads.length + 1 },
      ),
    ),
  );

  const musicMaps = raw.musicMaps.map((m, i) => {
    const example = i + 1;
    const fix = MAP_FIXES[`${key}/${example}`] ?? {};
    const cells = m.progressionText
      .split('|')
      .map((c) => c.trim())
      .filter(Boolean);
    const bars = cells.map((cell, b) => {
      const { degree, quality } = parseDegreeQuality(cell);
      const frets = fix.barFrets?.[b] ?? m.chordShapesShown[b];
      const page =
        [...triads, ...sevenths].find(
          (s) =>
            s.frets === frets && s.degree === degree && s.quality === quality,
        ) ?? pageShapes.find((s) => s.frets === frets && s.quality === quality);
      const bar = {
        degree,
        quality,
        frets,
        diagramStartFret: page
          ? page.diagramStartFret
          : defaultDiagramStart(frets),
        fingering: page ? page.fingering : [],
        rhythm: m.rhythmPerBar[b],
      };
      if (page?.barre) bar.barre = page.barre;
      const barErrata = fix.barErrata?.[b];
      if (barErrata) bar.erratumIds = barErrata;
      return bar;
    });
    const map = { example, bars, repeat: m.repeatSigns };
    const erratumIds = [
      ...(fix.erratumIds ?? []),
      ...(example === 5 ? [EXAMPLE_5_ERRATUM] : []),
    ];
    if (erratumIds.length) map.erratumIds = erratumIds;
    return map;
  });

  return {
    key,
    displayName: DISPLAY[key] ?? key,
    source: { pdfPages: [first, last] },
    signatureText: raw.signatureText,
    scaleNotes: raw.scaleNotes,
    pentatonicNotes: raw.pentatonicNotes,
    majorScale: scalePosition('major', raw.majorScale),
    pentatonic: scalePosition('pentatonic', raw.pentatonic),
    triads,
    sevenths,
    musicMaps,
  };
}

/**
 * JSON with every leaf object (no nested objects or arrays) and every array of
 * scalars kept on one line, so a key file reads like the book page.
 */
function compactJson(value) {
  return JSON.stringify(value, null, 2)
    .replace(
      /\{\n\s+([^{}[\]]*?)\n\s*\}/g,
      (_, inner) => `{ ${inner.replace(/,\n\s+/g, ', ')} }`,
    )
    .replace(
      /\[\n\s+([^{}[\]]*?)\n\s*\]/g,
      (_, inner) => `[${inner.replace(/,\n\s+/g, ', ')}]`,
    );
}

mkdirSync(OUT_DIR, { recursive: true });
for (const key of KEY_ORDER) {
  const name = FILE_NAME[key] ?? key;
  const constName = `${name.toUpperCase()}_MAJOR`;
  const center = buildKey(key);
  const body = [
    '// Generated by scripts/guitar/generateBookOneData.mjs from',
    '// src/curriculum/data/guitar/__fixtures__/bookOne.extraction.json, with the',
    '// corrections in ../bookOneErrata.ts applied. The integrity tests compare it',
    '// to the fixture: any difference must cite an erratum.',
    '',
    "import type { GuitarKeyCenter } from '../types';",
    '',
    `export const ${constName}: GuitarKeyCenter = ${compactJson(center)};`,
    '',
  ].join('\n');
  writeFileSync(join(OUT_DIR, `${name}.ts`), body);
  console.log(`wrote ${name}.ts`);
}
