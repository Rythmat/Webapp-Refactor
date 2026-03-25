import { DOUBLE_HARMONIC_MODES } from './doubleHarmonicContent';
import { HARMONIC_MAJOR_MODES } from './harmonicMajorContent';
import { HARMONIC_MINOR_MODES } from './harmonicMinorContent';
import { MELODIC_MINOR_MODES } from './melodicMinorContent';
import type { ScaleFamilyMode } from './modeHelpers';
import { RELATIVE_MODES_CONTENT, getRelativeMode } from './relativeModeContent';

// Normalize key roots so Unicode ♭/♯ and enharmonic equivalents all match
// the canonical spellings used by CHROMATIC_KEYS in ModeOverview.
const ENHARMONIC_TO_CANONICAL: Record<string, string> = {
  'C#': 'Db',
  'G#': 'Ab',
  'D#': 'Eb',
  'A#': 'Bb',
  Gb: 'F#',
};

function normalizeKey(key: string): string {
  const ascii = key.replace(/\u266D/g, 'b').replace(/\u266F/g, '#');
  return ENHARMONIC_TO_CANONICAL[ascii] ?? ascii;
}

const DIATONIC_MODE_INDEX: Record<string, number> = {
  ionian: 0,
  dorian: 1,
  phrygian: 2,
  lydian: 3,
  mixolydian: 4,
  aeolian: 5,
  locrian: 6,
};

const ALL_FAMILIES: ScaleFamilyMode[][] = [
  HARMONIC_MINOR_MODES,
  MELODIC_MINOR_MODES,
  HARMONIC_MAJOR_MODES,
  DOUBLE_HARMONIC_MODES,
];

// Build a fast lookup map: modeSlug → Map<rootKey, notes>
const SLUG_MAP = new Map<string, Map<string, string[]>>();

for (const family of ALL_FAMILIES) {
  for (const mode of family) {
    const keyMap = new Map<string, string[]>();
    for (const entry of mode.keys) {
      keyMap.set(normalizeKey(entry.root), entry.notes);
    }
    SLUG_MAP.set(mode.modeSlug, keyMap);
  }
}

/**
 * Look up the enharmonic-correct note spelling for a given mode + root key.
 * Returns undefined if no data is available for this combination.
 */
export function getNoteSpelling(
  modeSlug: string,
  rootKey: string,
): string[] | undefined {
  // Diatonic modes: derive from relative mode content
  const diatonicIdx = DIATONIC_MODE_INDEX[modeSlug];
  if (diatonicIdx !== undefined) {
    const entry = RELATIVE_MODES_CONTENT.find((e) => e.keyRoot === rootKey);
    if (!entry) return undefined;
    // getRelativeMode rotates so that the mode root is first
    // For diatonic, Ionian starts from the key root; other modes start from a rotation
    // But we need notes in the root of the REQUESTED key, not the parent key
    // e.g., D Dorian should find the C major key entry and rotate by 1 (Dorian index)
    // Actually, D Dorian = C major scale rotated to start on D
    // But rootKey here is the root of the mode (D), not the parent key (C)
    // So we need to find which parent key contains rootKey at position diatonicIdx
    for (const rel of RELATIVE_MODES_CONTENT) {
      const mode = getRelativeMode(rel.scaleNotes, diatonicIdx);
      if (normalizeKey(mode.root) === normalizeKey(rootKey)) {
        return mode.notes;
      }
    }
    return undefined;
  }

  // Non-diatonic modes: direct lookup
  const keyMap = SLUG_MAP.get(modeSlug);
  if (!keyMap) return undefined;
  return keyMap.get(normalizeKey(rootKey));
}

/**
 * Build a pitch-class → note-name map from the spelling data + scale MIDIs.
 * scaleMidis[i] and spelling[i] must correspond (same scale degree order).
 */
export function buildPitchClassSpellingMap(
  modeSlug: string,
  rootKey: string,
  scaleMidis: number[],
): Map<number, string> {
  const spelling = getNoteSpelling(modeSlug, rootKey);
  const map = new Map<number, string>();
  if (spelling) {
    for (let i = 0; i < spelling.length && i < scaleMidis.length; i++) {
      map.set(((scaleMidis[i] % 12) + 12) % 12, spelling[i]);
    }
  }
  return map;
}

const GENERIC_NAMES = [
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

/**
 * Convert a MIDI number to a note name + octave using the spelled pitch-class map.
 * Falls back to generic sharp-based names for notes not in the map.
 */
export function spelledMidiNoteName(
  midi: number,
  pcMap: Map<number, string>,
): string {
  const pc = ((midi % 12) + 12) % 12;
  const octave = Math.floor(midi / 12) - 1;
  const name = pcMap.get(pc);
  return `${name ?? GENERIC_NAMES[pc]}${octave}`;
}
