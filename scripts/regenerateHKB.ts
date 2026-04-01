#!/usr/bin/env npx tsx
/**
 * Regenerate the Harmony Knowledge Base (harmonyKB.ts) from authoritative
 * scale data in modes.ts.
 *
 * Fixes:
 * - 14 modes with wrong chord notes (notes not in scale)
 * - 8 missing modes (1,344 new entries)
 * - Degree string backslash corruption
 * - Enharmonic spelling issues
 *
 * Usage: npx tsx scripts/regenerateHKB.ts
 *   Writes output to src/curriculum/data/harmonyKB.generated.ts
 *   Run diff against existing harmonyKB.ts to review changes.
 */

import * as fs from 'fs';
import * as path from 'path';

// ── Scale data (from modes.ts ALL_MODES) ─────────────────────────────────

const ALL_MODES: Record<string, number[]> = {
  ionian: [0, 2, 4, 5, 7, 9, 11],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  aeolian: [0, 2, 3, 5, 7, 8, 10],
  locrian: [0, 1, 3, 5, 6, 8, 10],
  harmonicMinor: [0, 2, 3, 5, 7, 8, 11],
  locrianNat6: [0, 1, 3, 5, 6, 9, 10],
  ionianSharp5: [0, 2, 4, 5, 8, 9, 11],
  dorianSharp4: [0, 2, 3, 6, 7, 9, 10],
  phrygianDominant: [0, 1, 4, 5, 7, 8, 10],
  lydianSharp2: [0, 3, 4, 6, 7, 9, 11],
  alteredDiminished: [0, 1, 3, 4, 6, 8, 9],
  melodicMinor: [0, 2, 3, 5, 7, 9, 11],
  dorianFlat2: [0, 1, 3, 5, 7, 9, 10],
  lydianAugmented: [0, 2, 4, 6, 8, 9, 11],
  lydianDominant: [0, 2, 4, 6, 7, 9, 10],
  mixolydianFlat6: [0, 2, 4, 5, 7, 8, 10],
  locrianNat2: [0, 2, 3, 5, 6, 8, 10],
  altered: [0, 1, 3, 4, 6, 8, 10],
  harmonicMajor: [0, 2, 4, 5, 7, 8, 11],
  dorianFlat5: [0, 2, 3, 5, 6, 9, 10],
  alteredDominantNat5: [0, 1, 3, 4, 7, 8, 10],
  melodicMinorSharp4: [0, 2, 3, 6, 7, 9, 11],
  mixolydianFlat2: [0, 1, 4, 5, 7, 9, 10],
  lydianAugmentedSharp2: [0, 3, 4, 6, 8, 9, 11],
  locrianDoubleFlat7: [0, 1, 3, 5, 6, 8, 9],
  doubleHarmonicMajor: [0, 1, 4, 5, 7, 8, 11],
  lydianSharp2Sharp6: [0, 3, 4, 6, 7, 10, 11],
  ultraphrygian: [0, 1, 3, 4, 7, 8, 9],
  doubleHarmonicMinor: [0, 2, 3, 6, 7, 8, 11],
  oriental: [0, 1, 4, 5, 6, 9, 10],
  ionianSharp2Sharp5: [0, 3, 4, 5, 8, 9, 11],
  locrianDoubleFlat3DoubleFlat7: [0, 1, 2, 5, 6, 8, 9],
};

// ── HKB display names ────────────────────────────────────────────────────
// Maps modes.ts camelCase keys → HKB display names

const MODE_TO_HKB_NAME: Record<string, string> = {
  ionian: 'Ionian (Major)',
  dorian: 'Dorian',
  phrygian: 'Phrygian',
  lydian: 'Lydian',
  mixolydian: 'Mixolydian',
  aeolian: 'Aeolian (Minor)',
  locrian: 'Locrian',
  harmonicMinor: 'Harmonic Minor',
  locrianNat6: 'Locrian \u266E6',
  ionianSharp5: 'Ionian #5',
  dorianSharp4: 'Dorian #4',
  phrygianDominant: 'Phrygian Dominant',
  lydianSharp2: 'Lydian #2',
  alteredDiminished: 'Altered Diminished',
  melodicMinor: 'Melodic Minor',
  dorianFlat2: 'Dorian b2',
  lydianAugmented: 'Lydian Augmented',
  lydianDominant: 'Lydian Dominant',
  mixolydianFlat6: 'Mixolydian b6',
  locrianNat2: 'Locrian \u266E2',
  altered: 'Altered',
  harmonicMajor: 'Harmonic Major',
  dorianFlat5: 'Dorian b5',
  alteredDominantNat5: 'Altered Dominant \u266E5',
  melodicMinorSharp4: 'Melodic Minor #4',
  mixolydianFlat2: 'Mixolydian b2',
  lydianAugmentedSharp2: 'Lydian Augmented #2',
  locrianDoubleFlat7: 'Locrian bb7',
  doubleHarmonicMajor: 'Double Harmonic Major',
  lydianSharp2Sharp6: 'Lydian #2 #6',
  ultraphrygian: 'Ultraphrygian',
  doubleHarmonicMinor: 'Double Harmonic Minor',
  oriental: 'Oriental',
  ionianSharp2Sharp5: 'Ionian #2 #5',
  locrianDoubleFlat3DoubleFlat7: 'Locrian bb3 bb7',
};

// ── Note naming ──────────────────────────────────────────────────────────

const SHARP_NAMES = [
  'C',
  'C#',
  'D',
  'D#',
  'E',
  'F',
  'F#',
  'G',
  'G#',
  'A',
  'A#',
  'B',
];
const FLAT_NAMES = [
  'C',
  'Db',
  'D',
  'Eb',
  'E',
  'F',
  'Gb',
  'G',
  'Ab',
  'A',
  'Bb',
  'B',
];

const ROOT_NOTES = [
  'C',
  'Db',
  'D',
  'Eb',
  'E',
  'F',
  'F#',
  'G',
  'Ab',
  'A',
  'Bb',
  'B',
];

// Roots that prefer sharps vs flats
const SHARP_ROOTS = new Set(['C', 'G', 'D', 'A', 'E', 'B', 'F#']);
// const FLAT_ROOTS = new Set(['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb']);

function rootToSemitone(root: string): number {
  const map: Record<string, number> = {
    C: 0,
    'C#': 1,
    Db: 1,
    D: 2,
    'D#': 3,
    Eb: 3,
    E: 4,
    F: 5,
    'F#': 6,
    Gb: 6,
    G: 7,
    'G#': 8,
    Ab: 8,
    A: 9,
    'A#': 10,
    Bb: 10,
    B: 11,
  };
  return map[root] ?? 0;
}

/**
 * For a given root key, determine whether to use sharps or flats for
 * naming notes. This considers the root's natural preference.
 */
function usesSharps(root: string): boolean {
  return SHARP_ROOTS.has(root);
}

/**
 * Convert a semitone number (0-11) to a note name, using the appropriate
 * spelling based on the root key's accidental preference.
 *
 * For modes with altered degrees, we need contextual spelling.
 * This function uses a "letter distance" approach: each scale degree
 * must use a unique letter name (A-G).
 */
function semitoneToNoteName(semitone: number, preferSharps: boolean): string {
  const s = ((semitone % 12) + 12) % 12;
  return preferSharps ? SHARP_NAMES[s] : FLAT_NAMES[s];
}

// ── The Ionian (Major) scale intervals for degree computation ────────────

const IONIAN = [0, 2, 4, 5, 7, 9, 11];

/**
 * Compute the scale degree label for a given scale position.
 * Compares the semitone offset at that position against the major scale.
 *
 * Position 0 → degree 1, position 1 → degree 2, etc.
 * If the semitone differs from major scale:
 *   lower → 'b' prefix, higher → '#' prefix
 *   Two semitones lower → 'bb' prefix
 */
function computeDegree(semitone: number, position: number): string {
  const naturalSemitone = IONIAN[position];
  const diff = semitone - naturalSemitone;
  const degreeNum = position + 1;

  if (diff === 0) return `${degreeNum}`;
  if (diff === -1) return `b${degreeNum}`;
  if (diff === -2) return `bb${degreeNum}`;
  if (diff === 1) return `#${degreeNum}`;
  if (diff === 2) return `##${degreeNum}`;

  // Handle wrap-around (e.g., #7 = 0 semitones above octave)
  const wrappedDiff = ((diff % 12) + 12) % 12;
  if (wrappedDiff === 11) return `b${degreeNum}`;
  if (wrappedDiff === 10) return `bb${degreeNum}`;
  if (wrappedDiff === 1) return `#${degreeNum}`;
  return `${degreeNum}`;
}

// ── Chord quality detection ──────────────────────────────────────────────

interface ChordInfo {
  quality: string;
  intervals: string;
}

function classifyTriad(interval1: number, interval2: number): ChordInfo {
  // interval1 = semitones from root to 3rd
  // interval2 = semitones from root to 5th
  if (interval1 === 4 && interval2 === 7)
    return { quality: 'Major', intervals: '1, 3, 5' };
  if (interval1 === 3 && interval2 === 7)
    return { quality: 'Minor', intervals: '1, b3, 5' };
  if (interval1 === 3 && interval2 === 6)
    return { quality: 'Diminished', intervals: '1, b3, b5' };
  if (interval1 === 4 && interval2 === 8)
    return { quality: 'Augmented', intervals: '1, 3, #5' };
  // Less common triads
  if (interval1 === 4 && interval2 === 6)
    return { quality: 'Major(b5)', intervals: '1, 3, b5' };
  if (interval1 === 2 && interval2 === 6)
    return { quality: 'sus2(b5)', intervals: '1, 2, b5' };
  if (interval1 === 5 && interval2 === 7)
    return { quality: 'sus4', intervals: '1, 4, 5' };
  if (interval1 === 2 && interval2 === 7)
    return { quality: 'sus2', intervals: '1, 2, 5' };
  if (interval1 === 3 && interval2 === 8)
    return { quality: 'Minor(#5)', intervals: '1, b3, #5' };
  // Fallback
  return { quality: `[${interval1},${interval2}]`, intervals: `1, ?, ?` };
}

function classifySeventh(i1: number, i2: number, i3: number): ChordInfo {
  // i1 = root to 3rd, i2 = root to 5th, i3 = root to 7th
  const triad = classifyTriad(i1, i2);

  // Major 7 variants
  if (i3 === 11) {
    if (i1 === 4 && i2 === 7)
      return { quality: 'Major 7', intervals: '1, 3, 5, 7' };
    if (i1 === 3 && i2 === 7)
      return { quality: 'Minor Major 7', intervals: '1, b3, 5, 7' };
    if (i1 === 4 && i2 === 8)
      return { quality: 'Major 7(#5)', intervals: '1, 3, #5, 7' };
    if (i1 === 3 && i2 === 6)
      return { quality: 'Diminished Major 7', intervals: '1, b3, b5, 7' };
    if (i1 === 4 && i2 === 6)
      return { quality: 'Major 7(b5)', intervals: '1, 3, b5, 7' };
    return {
      quality: `${triad.quality} Maj7`,
      intervals: `${triad.intervals}, 7`,
    };
  }

  // Dominant/Minor 7 variants (b7 = 10 semitones)
  if (i3 === 10) {
    if (i1 === 4 && i2 === 7)
      return { quality: 'Dominant 7', intervals: '1, 3, 5, b7' };
    if (i1 === 3 && i2 === 7)
      return { quality: 'Minor 7', intervals: '1, b3, 5, b7' };
    if (i1 === 3 && i2 === 6)
      return { quality: 'Minor 7(b5)', intervals: '1, b3, b5, b7' };
    if (i1 === 4 && i2 === 8)
      return { quality: 'Augmented 7', intervals: '1, 3, #5, b7' };
    if (i1 === 4 && i2 === 6)
      return { quality: 'Dominant 7(b5)', intervals: '1, 3, b5, b7' };
    if (i1 === 2 && i2 === 6)
      return { quality: 'sus2(b5) add b7', intervals: '1, 2, b5, b7' };
    return {
      quality: `${triad.quality} 7`,
      intervals: `${triad.intervals}, b7`,
    };
  }

  // Diminished 7 (bb7 = 9 semitones)
  if (i3 === 9) {
    if (i1 === 3 && i2 === 6)
      return { quality: 'Diminished 7', intervals: '1, b3, b5, bb7' };
    return {
      quality: `${triad.quality} dim7`,
      intervals: `${triad.intervals}, bb7`,
    };
  }

  // Minor 6 (6 = 9 semitones, but context matters)
  // Actually bb7 and 6 are the same pitch (9 semitones). We distinguish by context:
  // dim triad + 9 semitones = dim7, minor triad + 9 = min6
  if (i3 === 9 && i1 === 3 && i2 === 7) {
    return { quality: 'Minor 6', intervals: '1, b3, 5, 6' };
  }

  // Fallback
  return {
    quality: `${triad.quality} [7th=${i3}]`,
    intervals: `${triad.intervals}, ?`,
  };
}

// ── Proper note spelling for scale degrees ───────────────────────────────

const LETTER_NAMES = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

/**
 * Spell scale notes using proper enharmonic conventions.
 * Each scale degree must use a different letter name, and
 * accidentals should be consistent with the degree type (flat degree → flat note).
 */
function spellScaleNotes(rootName: string, intervals: number[]): string[] {
  const rootSemitone = rootToSemitone(rootName);
  // Find the root's letter index
  const rootLetter = rootName[0];
  const rootLetterIdx = LETTER_NAMES.indexOf(rootLetter);

  const result: string[] = [];

  for (let pos = 0; pos < intervals.length; pos++) {
    const absSemitone = (rootSemitone + intervals[pos]) % 12;
    // Expected letter for this scale position
    const expectedLetterIdx = (rootLetterIdx + pos) % 7;
    const expectedLetter = LETTER_NAMES[expectedLetterIdx];

    // What semitone does the natural version of this letter correspond to?
    const naturalSemitones: Record<string, number> = {
      C: 0,
      D: 2,
      E: 4,
      F: 5,
      G: 7,
      A: 9,
      B: 11,
    };
    const naturalSemitone = naturalSemitones[expectedLetter];
    const diff = (absSemitone - naturalSemitone + 12) % 12;

    if (diff === 0) {
      result.push(expectedLetter);
    } else if (diff === 1) {
      result.push(`${expectedLetter}#`);
    } else if (diff === 11) {
      result.push(`${expectedLetter}b`);
    } else if (diff === 2) {
      result.push(`${expectedLetter}##`);
    } else if (diff === 10) {
      result.push(`${expectedLetter}bb`);
    } else {
      // Fallback to simple sharp/flat naming
      result.push(semitoneToNoteName(absSemitone, usesSharps(rootName)));
    }
  }

  return result;
}

/**
 * Format a note name to match HKB conventions.
 * HKB uses: C#, Db, etc. (single accidentals).
 * For double accidentals (##, bb), we keep them for theoretical correctness
 * but also provide the enharmonic where useful.
 */
function formatNoteName(name: string): string {
  // Only simplify double accidentals to single accidentals.
  // Do NOT simplify Cb→B, B#→C, E#→F, Fb→E — these preserve unique
  // letter names per scale degree (critical for correct music theory).
  const enharmonics: Record<string, string> = {
    Cbb: 'Bb',
    Dbb: 'C',
    Ebb: 'D',
    Fbb: 'Eb',
    Gbb: 'F',
    Abb: 'G',
    Bbb: 'A',
    'C##': 'D',
    'D##': 'E',
    'E##': 'F#',
    'F##': 'G',
    'G##': 'A',
    'A##': 'B',
    'B##': 'C#',
  };
  return enharmonics[name] ?? name;
}

// ── Interval string generation ───────────────────────────────────────────

function intervalsToString(intervals: number[]): string {
  return intervals.map((sem, pos) => computeDegree(sem, pos)).join(', ');
}

// ── Main generation ──────────────────────────────────────────────────────

interface HKBChordEntry {
  degree: string;
  chordRoot: string;
  quality: string;
  intervals: string;
  notes: string;
}

interface HKBModeRoot {
  mode: string;
  root: string;
  intervals: string;
  scaleNotes: string;
  triads: HKBChordEntry[];
  sevenths: HKBChordEntry[];
}

function generateModeRoot(modeKey: string, root: string): HKBModeRoot {
  const intervals = ALL_MODES[modeKey];
  const modeName = MODE_TO_HKB_NAME[modeKey];
  // Compute proper note names for the scale
  const scaleNoteNames = spellScaleNotes(root, intervals).map(formatNoteName);

  // Compute degrees
  const degrees = intervals.map((sem, pos) => computeDegree(sem, pos));

  // Build triads: for each position, stack 3rds from the scale (pos, pos+2, pos+4)
  const triads: HKBChordEntry[] = [];
  for (let pos = 0; pos < 7; pos++) {
    const rootIdx = pos;
    const thirdIdx = (pos + 2) % 7;
    const fifthIdx = (pos + 4) % 7;

    const chordRootSem = intervals[rootIdx];
    const thirdSem = (intervals[thirdIdx] - chordRootSem + 12) % 12;
    const fifthSem = (intervals[fifthIdx] - chordRootSem + 12) % 12;

    const chordInfo = classifyTriad(thirdSem, fifthSem);

    triads.push({
      degree: degrees[pos],
      chordRoot: scaleNoteNames[rootIdx],
      quality: chordInfo.quality,
      intervals: chordInfo.intervals,
      notes: [
        scaleNoteNames[rootIdx],
        scaleNoteNames[thirdIdx],
        scaleNoteNames[fifthIdx],
      ].join(', '),
    });
  }

  // Build seventh chords: stack 4 scale tones (pos, pos+2, pos+4, pos+6)
  const sevenths: HKBChordEntry[] = [];
  for (let pos = 0; pos < 7; pos++) {
    const rootIdx = pos;
    const thirdIdx = (pos + 2) % 7;
    const fifthIdx = (pos + 4) % 7;
    const seventhIdx = (pos + 6) % 7;

    const chordRootSem = intervals[rootIdx];
    const thirdSem = (intervals[thirdIdx] - chordRootSem + 12) % 12;
    const fifthSem = (intervals[fifthIdx] - chordRootSem + 12) % 12;
    const seventhSem = (intervals[seventhIdx] - chordRootSem + 12) % 12;

    const chordInfo = classifySeventh(thirdSem, fifthSem, seventhSem);

    sevenths.push({
      degree: degrees[pos],
      chordRoot: scaleNoteNames[rootIdx],
      quality: chordInfo.quality,
      intervals: chordInfo.intervals,
      notes: [
        scaleNoteNames[rootIdx],
        scaleNoteNames[thirdIdx],
        scaleNoteNames[fifthIdx],
        scaleNoteNames[seventhIdx],
      ].join(', '),
    });
  }

  return {
    mode: modeName,
    root,
    intervals: intervalsToString(intervals),
    scaleNotes: scaleNoteNames.join(', '),
    triads,
    sevenths,
  };
}

// ── Non-heptatonic scales (preserved from existing HKB) ──────────────────

// These scales have != 7 notes and can't be generated with the same
// triad/seventh stacking logic. We'll read them from the existing HKB.
// const NON_HEPTATONIC_MODES = new Set([
//   'Half-Whole Diminished',
//   'Whole-Half Diminished',
//   'Whole Tone',
//   'Major Blues',
//   'Minor Blues',
//   'Major Pentatonic',
//   'Minor Pentatonic',
// ]);

// ── Output generation ────────────────────────────────────────────────────

function escapeString(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function chordEntryToTS(entry: HKBChordEntry, indent: string): string {
  return [
    `${indent}{`,
    `${indent}  degree: '${escapeString(entry.degree)}',`,
    `${indent}  chordRoot: '${escapeString(entry.chordRoot)}',`,
    `${indent}  quality: '${escapeString(entry.quality)}',`,
    `${indent}  intervals: '${escapeString(entry.intervals)}',`,
    `${indent}  notes: '${escapeString(entry.notes)}',`,
    `${indent}},`,
  ].join('\n');
}

function modeRootToTS(entry: HKBModeRoot): string {
  const key = `${entry.mode}|${entry.root}`;
  const lines: string[] = [];
  lines.push(`  '${escapeString(key)}': {`);
  lines.push(`    mode: '${escapeString(entry.mode)}',`);
  lines.push(`    root: '${escapeString(entry.root)}',`);
  lines.push(`    intervals: '${escapeString(entry.intervals)}',`);
  lines.push(`    scaleNotes: '${escapeString(entry.scaleNotes)}',`);
  lines.push(`    triads: [`);
  for (const chord of entry.triads) {
    lines.push(chordEntryToTS(chord, '      '));
  }
  lines.push(`    ],`);
  lines.push(`    sevenths: [`);
  for (const chord of entry.sevenths) {
    lines.push(chordEntryToTS(chord, '      '));
  }
  lines.push(`    ],`);
  lines.push(`  },`);
  return lines.join('\n');
}

// ── Main ─────────────────────────────────────────────────────────────────

function main() {
  console.log('Generating Harmony Knowledge Base...');
  console.log(
    `  ${Object.keys(ALL_MODES).length} heptatonic modes × 12 roots = ${Object.keys(ALL_MODES).length * 12} entries`,
  );

  // Generate all heptatonic mode entries
  const entries: HKBModeRoot[] = [];
  const modeKeys = Object.keys(ALL_MODES);

  for (const modeKey of modeKeys) {
    for (const root of ROOT_NOTES) {
      entries.push(generateModeRoot(modeKey, root));
    }
  }

  // Sort entries alphabetically by key (mode|root)
  entries.sort((a, b) => {
    const keyA = `${a.mode}|${a.root}`;
    const keyB = `${b.mode}|${b.root}`;
    return keyA.localeCompare(keyB);
  });

  // Build output file
  const outputLines: string[] = [];
  outputLines.push(`/**`);
  outputLines.push(` * Phase 8 — Harmony Knowledge Base.`);
  outputLines.push(` * Auto-generated from modes.ts scale data.`);
  outputLines.push(
    ` * ${entries.length} entries: ${modeKeys.length} modes × 12 roots.`,
  );
  outputLines.push(` * Generated: ${new Date().toISOString()}`);
  outputLines.push(` * Lazy-loaded via dynamic import().`);
  outputLines.push(` */`);
  outputLines.push(``);
  outputLines.push(`export interface HKBChordEntry {`);
  outputLines.push(`  degree: string;`);
  outputLines.push(`  chordRoot: string;`);
  outputLines.push(`  quality: string;`);
  outputLines.push(`  intervals: string;`);
  outputLines.push(`  notes: string;`);
  outputLines.push(`}`);
  outputLines.push(``);
  outputLines.push(`export interface HKBModeRoot {`);
  outputLines.push(`  mode: string;`);
  outputLines.push(`  root: string;`);
  outputLines.push(`  intervals: string;`);
  outputLines.push(`  scaleNotes: string;`);
  outputLines.push(`  triads: HKBChordEntry[];`);
  outputLines.push(`  sevenths: HKBChordEntry[];`);
  outputLines.push(`}`);
  outputLines.push(``);
  outputLines.push(`/** Keyed by "mode|root" composite string */`);
  outputLines.push(`const HARMONY_KB: Record<string, HKBModeRoot> = {`);

  for (const entry of entries) {
    outputLines.push(modeRootToTS(entry));
  }

  // ── Extract non-heptatonic modes from existing HKB ──
  const scriptDir =
    import.meta.dirname ?? path.dirname(new URL(import.meta.url).pathname);
  const existingPath = path.resolve(
    scriptDir,
    '../src/curriculum/data/harmonyKB.ts',
  );
  const existingContent = fs.readFileSync(existingPath, 'utf-8');

  const nonHeptonicModes = [
    'Half-Whole Diminished',
    'Whole-Half Diminished',
    'Whole Tone',
    'Major Blues',
    'Minor Blues',
    'Major Pentatonic',
    'Minor Pentatonic',
  ];

  let nonHeptonicCount = 0;
  for (const modeName of nonHeptonicModes) {
    for (const root of ROOT_NOTES) {
      const key = `${modeName}|${root}`;
      const entryStart = existingContent.indexOf(`'${key}':`);
      if (entryStart === -1) continue;

      // Find the closing brace of this entry at depth 0
      let braceDepth = 0;
      let inEntry = false;
      let entryEnd = entryStart;
      for (let i = entryStart; i < existingContent.length; i++) {
        if (existingContent[i] === '{') {
          braceDepth++;
          inEntry = true;
        }
        if (existingContent[i] === '}') {
          braceDepth--;
          if (inEntry && braceDepth === 0) {
            entryEnd = i + 1;
            if (existingContent[entryEnd] === ',') entryEnd++;
            break;
          }
        }
      }

      let block = existingContent.slice(entryStart, entryEnd).trim();

      // Fix backslash corruption
      block = block.replace(/degree: '(\d)\\'/g, "degree: '$1'");
      block = block.replace(/degree: '\\\\#(\d)'/g, "degree: '#$1'");
      block = block.replace(/degree: '\\#(\d)'/g, "degree: '#$1'");

      outputLines.push(`  ${block}`);
      nonHeptonicCount++;
    }
  }

  console.log(
    `  Added ${nonHeptonicCount} non-heptatonic entries from existing HKB`,
  );

  outputLines.push(`};`);
  outputLines.push(``);
  outputLines.push(`export default HARMONY_KB;`);
  outputLines.push(``);

  // Write output
  const outputPath = path.resolve(
    scriptDir,
    '../src/curriculum/data/harmonyKB.generated.ts',
  );
  fs.writeFileSync(outputPath, outputLines.join('\n'), 'utf-8');

  console.log(`\nWritten to: ${outputPath}`);
  console.log(
    `  Total entries: ${entries.length + nonHeptonicCount} (${entries.length} heptatonic + ${nonHeptonicCount} non-heptatonic)`,
  );

  // Validation: spot-check some known-good chords
  console.log('\n── Validation spot-checks ──');

  // C Ionian should have C Major triad on degree 1
  const cIonian = entries.find(
    (e) => e.mode === 'Ionian (Major)' && e.root === 'C',
  );
  if (cIonian) {
    const d1 = cIonian.triads[0];
    console.log(
      `  C Ionian degree 1: ${d1.chordRoot} ${d1.quality} (${d1.notes}) — ${d1.quality === 'Major' ? '✓' : '✗'}`,
    );
    // Degree 2 should be D Minor
    const d2 = cIonian.triads[1];
    console.log(
      `  C Ionian degree 2: ${d2.chordRoot} ${d2.quality} (${d2.notes}) — ${d2.quality === 'Minor' ? '✓' : '✗'}`,
    );
  }

  // A Harmonic Minor should have Am(Maj7) on degree 1
  const aHm = entries.find(
    (e) => e.mode === 'Harmonic Minor' && e.root === 'A',
  );
  if (aHm) {
    const d1s = aHm.sevenths[0];
    console.log(
      `  A Harm Minor 7th degree 1: ${d1s.chordRoot} ${d1s.quality} (${d1s.notes}) — ${d1s.quality === 'Minor Major 7' ? '✓' : '✗'}`,
    );
  }

  // A Phrygian Dominant degree 3 triad should be Diminished (NOT Minor)
  const aPhDom = entries.find(
    (e) => e.mode === 'Phrygian Dominant' && e.root === 'A',
  );
  if (aPhDom) {
    const d3 = aPhDom.triads[2];
    console.log(
      `  A Phryg Dom degree 3 triad: ${d3.chordRoot} ${d3.quality} (${d3.notes}) — ${d3.quality === 'Diminished' ? '✓ FIXED' : '✗ STILL WRONG'}`,
    );
    const d4 = aPhDom.triads[3];
    console.log(
      `  A Phryg Dom degree 4 triad: ${d4.chordRoot} ${d4.quality} (${d4.notes}) — ${d4.quality === 'Minor' ? '✓ FIXED' : '✗ STILL WRONG'}`,
    );
  }

  // Ionian #5 should now exist
  const aIon5 = entries.find((e) => e.mode === 'Ionian #5' && e.root === 'A');
  if (aIon5) {
    console.log(`  A Ionian #5: EXISTS ✓ — scale: ${aIon5.scaleNotes}`);
    console.log(
      `    degree 1 triad: ${aIon5.triads[0].chordRoot} ${aIon5.triads[0].quality} (${aIon5.triads[0].notes})`,
    );
  } else {
    console.log(`  A Ionian #5: MISSING ✗`);
  }

  // Double Harmonic Major should now exist
  const cDhm = entries.find(
    (e) => e.mode === 'Double Harmonic Major' && e.root === 'C',
  );
  if (cDhm) {
    console.log(`  C Double Harm Major: EXISTS ✓ — scale: ${cDhm.scaleNotes}`);
  } else {
    console.log(`  C Double Harm Major: MISSING ✗`);
  }

  console.log(
    '\nDone. Review the generated file and compare with the existing harmonyKB.ts.',
  );
  console.log(
    'When satisfied, replace harmonyKB.ts with harmonyKB.generated.ts.',
  );
}

main();
