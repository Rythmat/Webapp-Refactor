import { CHORD_QUALITY_BY_ID } from '@/curriculum/data/chordQualityLibrary';

const ROOT_TO_PC: Record<string, number> = {
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

/**
 * Maps surface-form chord-quality strings (after the root has been peeled off
 * and any parens stripped) to canonical IDs in CHORD_QUALITY_LIBRARY.
 */
const SURFACE_TO_ID: Record<string, string> = {
  // Triads
  '': 'maj',
  maj: 'maj',
  M: 'maj',
  min: 'min',
  m: 'min',
  '-': 'min',
  dim: 'dim',
  '°': 'dim',
  o: 'dim',
  aug: 'aug',
  '+': 'aug',
  sus: 'sus4',
  sus4: 'sus4',
  sus2: 'sus2',
  '5': 'power',
  power: 'power',

  // Sevenths
  '7': 'dom7',
  maj7: 'maj7',
  M7: 'maj7',
  '∆7': 'maj7',
  '∆': 'maj7',
  min7: 'min7',
  m7: 'min7',
  '-7': 'min7',
  dim7: 'dim7',
  '°7': 'dim7',
  '7sus': 'dom7sus4',
  '7sus4': 'dom7sus4',
  sus7: 'dom7sus4',
  '7sus2': 'dom7sus2',
  maj7sus4: 'maj7sus4',
  maj7sus2: 'maj7sus2',
  min7b5: 'min7b5',
  'min7♭5': 'min7b5',
  m7b5: 'min7b5',
  'm7♭5': 'min7b5',
  ø: 'min7b5',
  ø7: 'min7b5',
  'min(maj7)': 'min_maj7',
  'm(maj7)': 'min_maj7',
  mMaj7: 'min_maj7',
  minMaj7: 'min_maj7',

  // Sixths
  '6': 'maj6',
  maj6: 'maj6',
  M6: 'maj6',
  min6: 'min6',
  m6: 'min6',

  // Add chords
  add2: 'add2',
  add9: 'add2', // same pitch-class set
  add4: 'add4',

  // Ninths
  '9': 'dom9',
  maj9: 'maj9',
  M9: 'maj9',
  min9: 'min9',
  m9: 'min9',

  // Elevenths / thirteenths
  '11': 'dom11',
  min11: 'min11',
  m11: 'min11',
  '13': 'dom13',
  min13: 'min13',
  m13: 'min13',
  maj13: 'maj13',
  M13: 'maj13',

  // Altered dominants (parens already stripped before lookup)
  '7b9': 'dom7b9',
  '7♭9': 'dom7b9',
  '7#9': 'dom7s9',
  '7♯9': 'dom7s9',
  '7b5': 'dom7b5',
  '7♭5': 'dom7b5',
  '7#5': 'dom7s5',
  '7♯5': 'dom7s5',
  '7aug': 'dom7s5',
  aug7: 'dom7s5',
  '7alt': 'dom7s5_b9',
  alt7: 'dom7s5_b9',
  '7altered': 'dom7s5_b9',
  '7#11': 'dom7s11',
  '7♯11': 'dom7s11',
  'maj7#11': 'maj7s11',
  'maj7♯11': 'maj7s11',
  '♯5': 'aug',
  '♭5': 'dim',
};

/** Strip parens (keeping their content) and surrounding whitespace. */
function normalizeQuality(s: string): string {
  return s.replace(/[()]/g, '').trim();
}

const warnedNames = new Set<string>();
function warnUnknown(chordName: string, normalized: string): void {
  if (typeof import.meta === 'undefined' || !import.meta.env?.DEV) return;
  if (warnedNames.has(chordName)) return;
  warnedNames.add(chordName);
  console.warn(
    `[chordParser] Unknown chord quality: ${JSON.stringify(chordName)} → ${JSON.stringify(normalized)}`,
  );
}

/**
 * Resolve a chord name like "F sus7" or "G♭maj7(♯11)" to a list of MIDI note
 * numbers in a single octave starting at middle C. Returns [] for the special
 * "no chord" markers and for unrecognized names.
 */
export function chordNameToMidi(chordName: string): number[] {
  if (!chordName) return [];
  const trimmed = chordName.trim();

  // No-chord markers
  if (/^N\.?C\.?$/i.test(trimmed)) return [];

  // Extract root note. Match either Unicode (♭/♯) or ASCII (b/#) accidentals.
  const rootMatch = trimmed.match(/^([A-G])([♭♯b#]?)/);
  if (!rootMatch) return [];
  const accidental =
    rootMatch[2] === 'b' ? '♭' : rootMatch[2] === '#' ? '♯' : rootMatch[2];
  const rootKey = rootMatch[1] + accidental;
  const pc = ROOT_TO_PC[rootKey];
  if (pc == null) return [];

  // Strip the root and any trailing slash-bass; the popup keyboard can't
  // sensibly render the bass note in its two-octave window.
  let remainder = trimmed.slice(rootMatch[0].length);
  remainder = remainder.replace(/\/[A-G][♭♯b#]?\d?(?:\([^)]*\))?$/, '').trim();

  const normalized = normalizeQuality(remainder);
  const id = SURFACE_TO_ID[normalized];
  if (!id) {
    warnUnknown(chordName, normalized);
    return [];
  }

  const entry = CHORD_QUALITY_BY_ID[id];
  if (!entry) {
    warnUnknown(chordName, normalized);
    return [];
  }

  const rootMidi = 60 + pc;
  return entry.rootPosition.map((iv) => rootMidi + iv);
}
