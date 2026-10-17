import type { ChordDegree, ModeName } from '../types';
import { CHORDS } from '../data/chords';
import { MODES, MODE_NAMES } from '../data/modes';
import { CHORD_COLORS } from '../data/keyColors';
import { noteNameLetter } from '../data/notes';

// ── Mode helpers ──────────────────────────────────────────────────────────

const DIATONIC_SET = new Set<string>(MODE_NAMES);

/** Returns true if the mode is one of the 7 diatonic modes. */
export function isDiatonicMode(mode: string): boolean {
  return DIATONIC_SET.has(mode);
}

/** Returns the semitone offset of a diatonic mode from its parent Ionian root. */
export function getModeOffset(mode: string): number {
  const idx = MODE_NAMES.indexOf(mode as ModeName);
  if (idx <= 0) return 0;
  return MODES.ionian[idx];
}

/**
 * Convert a degree prefix + quality from Ionian-relative to mode-relative.
 * Internal helper used by ionianToModeLabel and modeToIonianLabel.
 */
function convertDegreePart(
  degreeStr: string,
  quality: string,
  semitoneShift: number,
): string {
  const deg = chordDeg(`${degreeStr} _`);
  if (deg.degree === 0) return `${degreeStr} ${quality}`;
  const ionianScale = MODES.ionian;
  const srcSemitones = ionianScale[deg.degree - 1] + deg.modifier;
  const targetSemitones = (((srcSemitones + semitoneShift) % 12) + 12) % 12;

  for (let i = 0; i < ionianScale.length; i++) {
    if (ionianScale[i] === targetSemitones) return `${i + 1} ${quality}`;
  }
  for (let i = 0; i < ionianScale.length; i++) {
    if (ionianScale[i] === targetSemitones + 1) return `b${i + 1} ${quality}`;
  }
  for (let i = 0; i < ionianScale.length; i++) {
    if (ionianScale[i] === targetSemitones - 1) return `#${i + 1} ${quality}`;
  }
  return `${degreeStr} ${quality}`;
}

/** Parse the degree prefix string from a chord label (e.g., "b3" from "b3 minor"). */
function extractDegreePrefix(label: string): string {
  const spaceIdx = label.indexOf(' ');
  return spaceIdx >= 0 ? label.substring(0, spaceIdx) : label;
}

/**
 * Convert an Ionian-relative chord label to a mode-relative label.
 * Only transforms diatonic modes; non-diatonic modes return the label unchanged.
 *
 * Only the degree moves. A slash chord's quality ("major/3" in "3 major/3",
 * E/G♯) is a CHORDS key whose number places the bass from the chord's own
 * root, so it travels with the chord unchanged. Converting that number as a
 * key degree too stored E/G♯ in A aeolian as "5 major/5", which reads as E/B.
 */
export function ionianToModeLabel(ionianLabel: string, mode: string): string {
  if (mode === 'ionian' || !isDiatonicMode(mode)) return ionianLabel;
  const offset = getModeOffset(mode);
  if (offset === 0) return ionianLabel;

  const quality = unstepChord(ionianLabel);
  const degreeStr = extractDegreePrefix(ionianLabel);
  return convertDegreePart(degreeStr, quality, -offset);
}

/**
 * Convert a mode-relative chord label back to Ionian-relative.
 * Reverse of ionianToModeLabel: the degree moves, the quality (slash and
 * all) stays.
 */
export function modeToIonianLabel(modeLabel: string, mode: string): string {
  if (mode === 'ionian' || !isDiatonicMode(mode)) return modeLabel;
  const offset = getModeOffset(mode);
  if (offset === 0) return modeLabel;

  const quality = unstepChord(modeLabel);
  const degreeStr = extractDegreePrefix(modeLabel);
  return convertDegreePart(degreeStr, quality, offset);
}

/**
 * Given a chord's root pitch class, quality, and the session key pitch class,
 * resolves the degree-qualified chord key for CHORD_COLORS lookup.
 * Prefers the flat/sharp candidate that exists in CHORD_COLORS.
 * Shared by useLiveChordColor and prismSlice to guarantee identical results.
 */
export function resolveDegreeKey(
  rootPc: number,
  quality: string,
  keyPc: number,
): string | undefined {
  const ionian = MODES.ionian;
  const diff = (rootPc - keyPc + 12) % 12;
  const directIdx = ionian.indexOf(diff);
  if (directIdx >= 0) return `${directIdx + 1} ${quality}`;
  const flatIdx = ionian.indexOf(diff + 1);
  const sharpIdx = ionian.indexOf(diff - 1);
  const flatKey = flatIdx >= 0 ? `b${flatIdx + 1} ${quality}` : undefined;
  const sharpKey = sharpIdx >= 0 ? `#${sharpIdx + 1} ${quality}` : undefined;
  if (flatKey && sharpKey) {
    if (CHORD_COLORS[flatKey] !== undefined) return flatKey;
    if (CHORD_COLORS[sharpKey] !== undefined) return sharpKey;
    return flatKey;
  }
  return flatKey ?? sharpKey;
}

/**
 * Given a pitched chord (array of MIDI note numbers), returns the full name
 * like "C major" or "Eb minor7".
 */
export function chordName(pitchedChord: number[]): string {
  const r = pitchedChord[0];
  const steps = pitchedChord.map((x) => x - r);
  let quality = '';
  for (const [name, intervals] of Object.entries(CHORDS)) {
    if (
      intervals.length === steps.length &&
      intervals.every((v, i) => v === steps[i])
    ) {
      quality = name;
      break;
    }
  }
  return `${noteNameLetter(r)} ${quality}`;
}

/**
 * Given a pitched chord, returns just the chord quality without the note name.
 * e.g. "major", "minor7", "dominant7"
 */
export function flatChordName(pitchedChord: number[]): string {
  const r = pitchedChord[0];
  const steps = pitchedChord.map((x) => x - r);
  for (const [name, intervals] of Object.entries(CHORDS)) {
    if (
      intervals.length === steps.length &&
      intervals.every((v, i) => v === steps[i])
    ) {
      return name;
    }
  }
  return '';
}

/**
 * Given an unpitched chord (intervals from root, e.g. [0,4,7]),
 * returns the chord quality name from the dictionary.
 * Defaults to "major7" if not found.
 */
export function unpitchedChordName(unpitchedChord: number[]): string {
  for (const [name, intervals] of Object.entries(CHORDS)) {
    if (
      intervals.length === unpitchedChord.length &&
      intervals.every((v, i) => v === unpitchedChord[i])
    ) {
      return name;
    }
  }
  return 'major7';
}

/**
 * Given a pitched chord and the root of the progression, returns a degree-qualified
 * name like "1 major", "b3 dominant7", "#4 diminished".
 */
export function steppedChord(pitchedChord: number[], root: number): string {
  // Wrap to a positive 0..11 semitone interval. Scale degrees are an
  // octave-equivalent concept, so callers that pass MIDI notes anchored to
  // a different octave than `root` (e.g. the Song Chart's chord-popup,
  // which always voices chords in C4) still resolve to the right degree.
  const diff = (((pitchedChord[0] - root) % 12) + 12) % 12;
  const degs = MODES.ionian;
  let degree = -1;
  let flat = false;

  for (let i = 0; i < degs.length; i++) {
    if (degs[i] === diff) {
      degree = i;
      break;
    }
  }

  if (degree < 0) {
    flat = true;
    for (let i = 0; i < degs.length; i++) {
      if (degs[i] === diff + 1) {
        degree = i;
        break;
      }
    }
  }

  const name = flatChordName(pitchedChord);
  return flat ? `b${degree + 1} ${name}` : `${degree + 1} ${name}`;
}

/**
 * Parses a degree prefix from a graph chord name.
 * "b3" -> { degree: 3, modifier: -1 }
 * "#4" -> { degree: 4, modifier: 1 }
 * "2"  -> { degree: 2, modifier: 0 }
 */
export function chordDeg(chord: string): ChordDegree {
  if (chord.length < 2) {
    return { degree: 0, modifier: 0 };
  }
  if (chord[0] === 'b') {
    return { degree: parseInt(chord[1], 10), modifier: -1 };
  }
  if (chord[0] === '#') {
    return { degree: parseInt(chord[1], 10), modifier: 1 };
  }
  return { degree: parseInt(chord[0], 10), modifier: 0 };
}

/**
 * Given the root MIDI note and a degree-qualified chord string (e.g. "b3 minor"),
 * returns the MIDI note of that scale degree.
 */
export function degreeMidi(root: number, chord: string): number {
  if (!chord) {
    return root;
  }
  const scale = MODES.ionian;
  const deg = chordDeg(chord);
  return root + scale[deg.degree - 1] + deg.modifier;
}

/**
 * Removes the degree prefix from a graph chord name.
 * "b3 dominant7" -> "dominant7"
 * "" -> "__"
 */
export function unstepChord(chord: string): string {
  if (chord.length > 0) {
    return chord.substring(chord.indexOf(' ') + 1);
  }
  return '__';
}

/**
 * Alias for steppedChord.
 */
export function degreeChordName(chord: number[], root: number): string {
  return steppedChord(chord, root);
}

/**
 * Abbreviates chord quality names in a sequence string.
 * dominant -> dom, diminished -> dim, minor -> min, major -> maj
 */
export function abbreviateSequence(sequence: string): string {
  return sequence
    .replace(/dominant/g, 'dom')
    .replace(/diminished/g, 'dim')
    .replace(/minor/g, 'min')
    .replace(/major/g, 'maj');
}

/**
 * Joins an array of chord names with "|" to form a graph key.
 */
export function graphToken(chordNames: string[]): string {
  return chordNames.join('|');
}

// ── Inversion Detection ─────────────────────────────────────────────────

export interface ChordMatch {
  quality: string;
  rootPc: number;
  bassNote: number;
  inversion: number;
}

/** A 12-bit set of pitch classes measured from a root (bit n = n semitones). */
function pitchClassMask(intervals: Iterable<number>): number {
  let mask = 0;
  for (const v of intervals) mask |= 1 << ((v % 12) + 12) % 12;
  return mask;
}

/**
 * The detectable chords keyed by their pitch-class set, built once from the
 * static CHORDS table. detectChordWithInversion runs on every live note change
 * in each mounted instrument view and once per region in session analysis, so
 * it looks a candidate root's set up here instead of re-normalizing every
 * definition per call. When several qualities share a set, the first in CHORDS
 * order wins, as the old in-order scan did. Slash chords are voicing variants,
 * not for detection.
 */
const DETECTABLE_CHORDS: ReadonlyMap<
  number,
  { name: string; def: readonly number[] }
> = (() => {
  const byMask = new Map<number, { name: string; def: readonly number[] }>();
  for (const [name, def] of Object.entries(CHORDS)) {
    if (name.includes('/')) continue;
    const mask = pitchClassMask(def);
    if (!byMask.has(mask)) byMask.set(mask, { name, def });
  }
  return byMask;
})();

// ── The simplest reading ─────────────────────────────────────────────────
// Notes can usually be named more than one way, and the first exact match in
// CHORDS isn't always the one a musician means: G♭-C-F matches "F sus♭2"
// exactly, where over an A♭ bass it is plainly A♭13. Musical Occam's razor:
// read the notes every way they go — every note as the root, exactly or with
// the tones voicings leave out — and take the simplest. A rare chord costs
// most, then a tone missing, then an inversion; a chord rooted on its bass
// costs nothing extra.

/**
 * Chords the engine can name that musicians rarely mean: nearly always a
 * common chord read from the wrong root or missing its bass. One is kept only
 * when nothing simpler fits.
 */
const RARE_QUALITIES: ReadonlySet<string> = new Set([
  'susb2',
  'susb2b5',
  'sus2b5',
  'sus#4',
  'majorb5',
  'major4',
  'minor4',
  'quartal',
  'Add4',
  'sus2b5add6',
  'major7diminished',
  'diminishedmajor7',
  'major7#5',
  'major7b5',
  'minor7#5',
  'major7sus2',
  'major7sus4',
  'minormajor9',
  'major9#5',
  'major7#9',
  'major7#5#9',
  'dominant7#5#9',
  'dominant7#5b9',
  'diminished7b9',
  'minor7b5b9',
  'minor9b5',
  'b7dominant7#11',
]);

/** Whether a quality is one musicians rarely mean (RARE_QUALITIES). */
export const isRareQuality = (quality: string): boolean =>
  RARE_QUALITIES.has(quality);

/** What a rare quality costs a reading. */
export const RARE_COST = 3;
/** What each tone left out costs. */
const OMISSION_COST = 1;
/** What a bass outside the chord costs: the upper chord over it, "D/C". */
export const SLASH_COST = 2;

/** A detectable chord's tones above its root, and those a voicing may leave out. */
const READABLE_CHORDS: ReadonlyArray<{
  name: string;
  tones: ReadonlySet<number>;
  optional: ReadonlySet<number>;
  sixth: boolean;
}> = Object.entries(CHORDS)
  .filter(([name]) => !name.includes('/'))
  .map(([name, def]) => {
    const has13 = def.includes(21);
    const has11 = def.includes(17) || def.includes(18);
    // The 5th of any chord; under an 11th or 13th the 9th; under a 13th the
    // 11th. The 3rd and 7th say what the chord is, so they always stay.
    const optional = new Set([7]);
    if (has13 || has11) optional.add(2);
    if (has13) optional.add(5);
    return {
      name,
      tones: new Set(def.map((v) => ((v % 12) + 12) % 12)),
      optional,
      sixth: name === 'major6' || name === 'minor6',
    };
  });

/** What it costs to hear the bass as this tone of the chord. */
function bassCost(interval: number): number {
  if (interval === 0) return 0;
  // The 3rd or the 5th: an everyday inversion.
  if ([3, 4, 6, 7, 8].includes(interval)) return 1.5;
  // The 7th (or a 6th chord's 6th): third inversion.
  if ([9, 10, 11].includes(interval)) return 2;
  // A 9th, 11th or 13th under the chord is barely ever what's meant.
  return 4;
}

/** One way to name a set of notes, and how simple it is (lower is simpler). */
export interface ChordReading {
  quality: string;
  rootPc: number;
  score: number;
}

/**
 * Every way to read `pitchClasses` over `bassPc` as one chord — each pitch
 * class as the root, exactly or leaving out the tones voicings leave out —
 * simplest first. Every note has to be a tone of the chord. Ties go to the
 * chord rooted on the bass, then a 7th chord over a 6th, then CHORDS order.
 */
export function chordReadings(
  pitchClasses: Iterable<number>,
  bassPc: number,
): ChordReading[] {
  const mod = (n: number) => ((n % 12) + 12) % 12;
  const pcs = [...new Set([...pitchClasses, bassPc].map(mod))];
  const readings: (ChordReading & { order: number; sixth: boolean })[] = [];
  for (const rootPc of pcs) {
    const played = new Set(pcs.map((pc) => mod(pc - rootPc)));
    READABLE_CHORDS.forEach(({ name, tones, optional, sixth }, order) => {
      if (![...played].every((t) => tones.has(t))) return;
      const missing = [...tones].filter((t) => !played.has(t));
      if (!missing.every((t) => optional.has(t))) return;
      readings.push({
        quality: name,
        rootPc,
        score:
          (RARE_QUALITIES.has(name) ? RARE_COST : 0) +
          missing.length * OMISSION_COST +
          bassCost(mod(bassPc - rootPc)),
        order,
        sixth,
      });
    });
  }
  const onBass = (r: ChordReading) => (r.rootPc === mod(bassPc) ? 0 : 1);
  return readings
    .sort(
      (a, b) =>
        a.score - b.score ||
        onBass(a) - onBass(b) ||
        Number(a.sixth) - Number(b.sixth) ||
        a.order - b.order,
    )
    .map(({ quality, rootPc, score }) => ({ quality, rootPc, score }));
}

/**
 * Given sorted MIDI notes, detects the chord quality and inversion.
 * Tries each pitch class as a potential root to recognize inversions.
 * Returns null if no chord is recognized.
 */
export function detectChordWithInversion(
  pitchedChord: number[],
): ChordMatch | null {
  if (pitchedChord.length < 2) return null;

  const sorted = [...pitchedChord].sort((a, b) => a - b);
  const bassNote = sorted[0];
  const bassPc = bassNote % 12;

  // Unique pitch classes, sorted ascending
  const pcs = [...new Set(sorted.map((n) => n % 12))].sort((a, b) => a - b);
  if (pcs.length < 2) return null;

  // Try bass pitch class first (root position priority)
  const candidates = [bassPc, ...pcs.filter((pc) => pc !== bassPc)];

  let bestMatch: ChordMatch | null = null;

  for (const candidate of candidates) {
    // The held pitch classes measured from this candidate root.
    const found = DETECTABLE_CHORDS.get(
      pitchClassMask(pcs.map((pc) => pc - candidate)),
    );
    if (!found) continue;
    const { name, def } = found;

    // Determine inversion from bass note position
    const bassInterval = (bassPc - candidate + 12) % 12;
    let inversion = 0;
    for (let j = 1; j < def.length; j++) {
      if (def[j] % 12 === bassInterval) {
        inversion = j;
        break;
      }
    }

    const match: ChordMatch = {
      quality: name,
      rootPc: candidate,
      bassNote,
      inversion,
    };

    // Root position → return immediately, unless it's a rare chord a
    // simpler reading might name (simplestMatch).
    if (candidate === bassPc) {
      if (!RARE_QUALITIES.has(name)) return match;
      return simplestMatch(pcs, bassNote) ?? match;
    }

    // Non-root: prefer 7th chords over 6th chords
    if (!bestMatch) {
      bestMatch = match;
    } else {
      const bestIs6th =
        bestMatch.quality === 'major6' || bestMatch.quality === 'minor6';
      const currentIs6th = name === 'major6' || name === 'minor6';
      if (bestIs6th && !currentIs6th) {
        bestMatch = match;
      }
    }
  }

  if (bestMatch && !RARE_QUALITIES.has(bestMatch.quality)) return bestMatch;
  return simplestMatch(pcs, bassNote) ?? bestMatch;
}

/**
 * The simplest reading of the notes (chordReadings) as a match: for notes no
 * chord spells exactly — a 13th played 1-3-♭7-13 — and in place of a rare one.
 */
function simplestMatch(pcs: number[], bassNote: number): ChordMatch | null {
  const bassPc = bassNote % 12;
  const [best] = chordReadings(pcs, bassPc);
  if (!best) return null;
  const def = CHORDS[best.quality];
  const bassInterval = (bassPc - best.rootPc + 12) % 12;
  const inversion = Math.max(
    0,
    def.findIndex((v, j) => j > 0 && ((v % 12) + 12) % 12 === bassInterval),
  );
  return { quality: best.quality, rootPc: best.rootPc, bassNote, inversion };
}
