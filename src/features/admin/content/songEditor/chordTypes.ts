import { detectChordWithInversion, noteNameInKey } from '@prism/engine';
import { CHORD_QUALITY_LIBRARY } from '@/curriculum/data/chordQualityLibrary';
import { normalizeAccidentals } from '../songChart/chartOps';
import { pitchClass } from './songDefaults';

/**
 * Chord-type dropdown + MIDI-analysis helpers for the chord popup.
 *
 * The dropdown reuses the canonical `CHORD_QUALITY_LIBRARY` (names + categories)
 * but only exposes qualities we can round-trip into a display symbol that
 * `chordNameToMidi` parses back — via the curated id→suffix table below.
 */

/** Chord-quality id → display suffix appended after the root (`C` + `maj7`). */
const ID_TO_SUFFIX: Record<string, string> = {
  maj: '',
  min: 'm',
  dim: 'dim',
  aug: 'aug',
  sus2: 'sus2',
  sus4: 'sus4',
  power: '5',
  maj6: '6',
  min6: 'm6',
  dom7: '7',
  maj7: 'maj7',
  min7: 'm7',
  dim7: 'dim7',
  min7b5: 'm7♭5',
  min_maj7: 'mMaj7',
  dom7sus4: '7sus4',
  add2: 'add2',
  add4: 'add4',
  dom9: '9',
  maj9: 'maj9',
  min9: 'm9',
  dom11: '11',
  min11: 'm11',
  dom13: '13',
  maj13: 'maj13',
  min13: 'm13',
};

export interface ChordType {
  id: string;
  label: string;
  suffix: string;
  category: string;
}

/** The chord-type options, in library order, restricted to round-trippable ids. */
export const CHORD_TYPES: ChordType[] = CHORD_QUALITY_LIBRARY.filter(
  (q) => q.id in ID_TO_SUFFIX,
).map((q) => ({
  id: q.id,
  label: q.name,
  suffix: ID_TO_SUFFIX[q.id],
  category: q.category,
}));

/** Compose a display chord name from a root note name and a chord type. */
export const composeChordName = (root: string, type: ChordType): string =>
  `${root}${type.suffix}`;

// Engine chord-quality token (CHORDS key) → the same display suffix.
const ENGINE_TO_SUFFIX: Record<string, string> = {
  major: '',
  minor: 'm',
  augmented: 'aug',
  diminished: 'dim',
  sus2: 'sus2',
  sus4: 'sus4',
  '5': '5',
  major6: '6',
  minor6: 'm6',
  diminished7: 'dim7',
  minor7b5: 'm7♭5',
  dominant7: '7',
  dominant9: '9',
  major7: 'maj7',
  minor7: 'm7',
  minormajor7: 'mMaj7',
  dominant7sus4: '7sus4',
  dominant7sus2: '7sus2',
  major9: 'maj9',
  minor9: 'm9',
  dominant13: '13',
  major13: 'maj13',
  minor13: 'm13',
  Add2: 'add2',
  Add4: 'add4',
};

/**
 * Analyze MIDI notes into a display chord name, key-aware for the root
 * spelling. Returns null when no chord is recognized (fewer than 2 notes or a
 * non-standard cluster).
 */
export const analyzeMidiToChordName = (
  midi: number[],
  keyRoot: number,
): string | null => {
  const match = detectChordWithInversion([...midi].sort((a, b) => a - b));
  if (!match) return null;
  const rootName = normalizeAccidentals(
    noteNameInKey(match.rootPc, pitchClass(keyRoot)),
  );
  const suffix = ENGINE_TO_SUFFIX[match.quality] ?? '';
  return `${rootName}${suffix}`;
};
