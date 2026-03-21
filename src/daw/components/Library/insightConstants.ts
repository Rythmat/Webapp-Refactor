import {
  CHORDS,
  MODES,
  chordDeg,
  unstepChord,
  noteNameInKey,
} from '@prism/engine';
import type { ModalInterchangeAnnotation } from '@/unison/types/schema';

// ── Quality display abbreviations ────────────────────────────────────────

export const QUALITY_DISPLAY: Record<string, string> = {
  // Triads
  major: 'maj',
  minor: 'min',
  diminished: 'dim',
  augmented: 'aug',
  sus2: 'sus2',
  sus4: 'sus4',
  quartal: 'quartal',
  'sus#4': 'sus(#4)',
  susb2: 'sus(\u266D2)',
  susb2b5: 'sus(\u266D2\u266D5)',
  sus2b5: 'sus2(\u266D5)',
  major4: 'maj4',
  minor4: 'min4',
  Add2: 'add2',
  Add4: 'add4',
  // 6th chords
  major6: 'maj6',
  minor6: 'min6',
  major6add9: 'maj6/9',
  // 7th chords
  major7: 'maj7',
  minor7: 'min7',
  dominant7: 'dom7',
  diminished7: 'dim7',
  minor7b5: 'min7(\u266D5)',
  minormajor7: 'min(maj7)',
  major7diminished: 'dim(maj7)',
  'minor7#5': 'min7(#5)',
  'major7#5': 'maj7(#5)',
  major7b5: 'maj7(\u266D5)',
  dominant7b5: 'dom7(\u266D5)',
  'dominant7#5': 'dom7(#5)',
  dominant7b9: 'dom7(\u266D9)',
  'major7#11': 'maj7(#11)',
  'dominant7#11': 'dom7(#11)',
  'b7dominant7#11': '\u266D7dom7(#11)',
  // 7th sus chords
  dominant7sus2: 'dom7sus2',
  dominant7sus4: 'dom7sus4',
  major7sus2: 'maj7sus2',
  major7sus4: 'maj7sus4',
  // 9th chords
  dominant9: 'dom9',
  major9: 'maj9',
  minor9: 'min9',
  minor7b9: 'min7(\u266D9)',
  minormajor9: 'min(maj9)',
  'major9#5': 'maj9(#5)',
  diminished7b9: 'dim7(\u266D9)',
  minor7b5b9: 'min7(\u266D5\u266D9)',
  'major7#9': 'maj7(#9)',
  'dominant7#5b9': 'dom7(#5\u266D9)',
  'dominant9#5': 'dom9(#5)',
  minor9b5: 'min9(\u266D5)',
  'dominant7#9': 'dom7(#9)',
  'dominant7#5#9': 'dom7(#5#9)',
  'major7#5#9': 'maj7(#5#9)',
  minor6add9: 'min6/9',
  diminishedmajor7: 'dim(maj7)',
  // Slash chords
  'major/5': 'maj/5',
  'major/4': 'maj/4',
  'major/3': 'maj/3',
  'major/6': 'maj/6',
  'major/1': 'maj/1',
  'major/7': 'maj/7',
  'major/#5': 'maj/#5',
  'major7/5': 'maj7/5',
  'minor6/5': 'min6/5',
  'minor6/b3': 'min6/\u266D3',
  'minor6/b6': 'min6/\u266D6',
  'minor7b5/4': 'min7(\u266D5)/4',
  'minor7b5/5': 'min7(\u266D5)/5',
};

// ── Helper functions ─────────────────────────────────────────────────────

export function formatQuality(quality: string): string {
  return (
    QUALITY_DISPLAY[quality] ??
    quality
      .replace(/dominant/g, 'dom')
      .replace(/diminished/g, 'dim')
      .replace(/minor/g, 'min')
      .replace(/major/g, 'maj')
  );
}

export function degreeToHybrid(degreeName: string): string {
  const deg = chordDeg(degreeName);
  const quality = unstepChord(degreeName);
  const prefix = deg.modifier === -1 ? '\u266D' : deg.modifier === 1 ? '#' : '';
  return `${prefix}${deg.degree} ${formatQuality(quality)}`;
}

export function intervalsToString(intervals: number[]): string {
  const INTERVAL_NAMES: Record<number, string> = {
    0: 'R',
    1: 'b2',
    2: '2',
    3: 'b3',
    4: '3',
    5: '4',
    6: 'b5',
    7: '5',
    8: '#5',
    9: '6',
    10: 'b7',
    11: '7',
    12: '8',
    13: 'b9',
    14: '9',
    15: '#9',
    16: '10',
    17: '11',
    18: '#11',
  };
  return intervals
    .map((i) => {
      const positive = i < 0 ? i + 12 : i;
      return INTERVAL_NAMES[positive] ?? String(i);
    })
    .join(' ');
}

export function rgbString(r: number, g: number, b: number): string {
  return `rgb(${r},${g},${b})`;
}

const MIDI_NOTE_NAMES = [
  'C',
  'C#',
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

export function midiToNoteName(midi: number): string {
  return `${MIDI_NOTE_NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`;
}

// ── Scale / Mode lookup tables ───────────────────────────────────────────

export const ROOT_TO_KEY_INDEX = [1, 8, 3, 10, 5, 12, 7, 2, 9, 4, 11, 6];

export const PARENT_SCALE_INFO: Record<
  string,
  { offset: number; family: string }
> = {
  // Diatonic → parent is Ionian
  ionian: { offset: 0, family: 'Ionian' },
  dorian: { offset: 10, family: 'Ionian' },
  phrygian: { offset: 8, family: 'Ionian' },
  lydian: { offset: 7, family: 'Ionian' },
  mixolydian: { offset: 5, family: 'Ionian' },
  aeolian: { offset: 3, family: 'Ionian' },
  locrian: { offset: 1, family: 'Ionian' },
  // Harmonic Minor family
  harmonicMinor: { offset: 0, family: 'Harmonic Minor' },
  locrianNat6: { offset: 10, family: 'Harmonic Minor' },
  ionianSharp5: { offset: 9, family: 'Harmonic Minor' },
  dorianSharp4: { offset: 7, family: 'Harmonic Minor' },
  phrygianDominant: { offset: 5, family: 'Harmonic Minor' },
  lydianSharp2: { offset: 4, family: 'Harmonic Minor' },
  alteredDiminished: { offset: 1, family: 'Harmonic Minor' },
  // Melodic Minor family
  melodicMinor: { offset: 0, family: 'Melodic Minor' },
  dorianFlat2: { offset: 10, family: 'Melodic Minor' },
  lydianAugmented: { offset: 9, family: 'Melodic Minor' },
  lydianDominant: { offset: 7, family: 'Melodic Minor' },
  mixolydianFlat6: { offset: 5, family: 'Melodic Minor' },
  locrianNat2: { offset: 3, family: 'Melodic Minor' },
  altered: { offset: 1, family: 'Melodic Minor' },
  // Harmonic Major family
  harmonicMajor: { offset: 0, family: 'Harmonic Major' },
  dorianFlat5: { offset: 10, family: 'Harmonic Major' },
  alteredDominantNat5: { offset: 8, family: 'Harmonic Major' },
  melodicMinorSharp4: { offset: 7, family: 'Harmonic Major' },
  mixolydianFlat2: { offset: 5, family: 'Harmonic Major' },
  lydianAugmentedSharp2: { offset: 4, family: 'Harmonic Major' },
  locrianDoubleFlat7: { offset: 1, family: 'Harmonic Major' },
  // Double Harmonic family
  doubleHarmonicMajor: { offset: 0, family: 'Double Harmonic Major' },
  lydianSharp2Sharp6: { offset: 11, family: 'Double Harmonic Major' },
  ultraphrygian: { offset: 8, family: 'Double Harmonic Major' },
  doubleHarmonicMinor: { offset: 7, family: 'Double Harmonic Major' },
  oriental: { offset: 5, family: 'Double Harmonic Major' },
  ionianSharp2Sharp5: { offset: 4, family: 'Double Harmonic Major' },
  locrianDoubleFlat3DoubleFlat7: { offset: 1, family: 'Double Harmonic Major' },
};

export const FAMILY_INTERVALS: Record<string, number[]> = {
  Ionian: [0, 2, 4, 5, 7, 9, 11],
  'Harmonic Minor': [0, 2, 3, 5, 7, 8, 11],
  'Melodic Minor': [0, 2, 3, 5, 7, 9, 11],
  'Harmonic Major': [0, 2, 4, 5, 7, 8, 11],
  'Double Harmonic Major': [0, 1, 4, 5, 7, 8, 11],
};

export const FAMILY_MODES: Record<string, string[]> = {
  Ionian: [
    'ionian',
    'dorian',
    'phrygian',
    'lydian',
    'mixolydian',
    'aeolian',
    'locrian',
  ],
  'Harmonic Minor': [
    'harmonicMinor',
    'locrianNat6',
    'ionianSharp5',
    'dorianSharp4',
    'phrygianDominant',
    'lydianSharp2',
    'alteredDiminished',
  ],
  'Melodic Minor': [
    'melodicMinor',
    'dorianFlat2',
    'lydianAugmented',
    'lydianDominant',
    'mixolydianFlat6',
    'locrianNat2',
    'altered',
  ],
  'Harmonic Major': [
    'harmonicMajor',
    'dorianFlat5',
    'alteredDominantNat5',
    'melodicMinorSharp4',
    'mixolydianFlat2',
    'lydianAugmentedSharp2',
    'locrianDoubleFlat7',
  ],
  'Double Harmonic Major': [
    'doubleHarmonicMajor',
    'lydianSharp2Sharp6',
    'ultraphrygian',
    'doubleHarmonicMinor',
    'oriental',
    'ionianSharp2Sharp5',
    'locrianDoubleFlat3DoubleFlat7',
  ],
};

export const MODE_DISPLAY: Record<string, string> = {
  ionian: 'Ionian',
  dorian: 'Dorian',
  phrygian: 'Phrygian',
  lydian: 'Lydian',
  mixolydian: 'Mixolydian',
  aeolian: 'Aeolian',
  locrian: 'Locrian',
  harmonicMinor: 'Harmonic Minor',
  locrianNat6: 'Locrian \u266E6',
  ionianSharp5: 'Ionian #5',
  dorianSharp4: 'Dorian #4',
  phrygianDominant: 'Phrygian Dominant',
  lydianSharp2: 'Lydian #2',
  alteredDiminished: 'Altered Diminished',
  melodicMinor: 'Melodic Minor',
  dorianFlat2: 'Dorian \u266D2',
  lydianAugmented: 'Lydian Augmented',
  lydianDominant: 'Lydian Dominant',
  mixolydianFlat6: 'Mixolydian \u266D6',
  locrianNat2: 'Locrian \u266E2',
  altered: 'Altered',
  harmonicMajor: 'Harmonic Major',
  dorianFlat5: 'Dorian \u266D5',
  alteredDominantNat5: 'Altered Dominant \u266E5',
  melodicMinorSharp4: 'Melodic Minor #4',
  mixolydianFlat2: 'Mixolydian \u266D2',
  lydianAugmentedSharp2: 'Lydian Augmented #2',
  locrianDoubleFlat7: 'Locrian \u266D\u266D7',
  doubleHarmonicMajor: 'Double Harmonic Major',
  lydianSharp2Sharp6: 'Lydian #2 #6',
  ultraphrygian: 'Ultraphrygian',
  doubleHarmonicMinor: 'Double Harmonic Minor',
  oriental: 'Oriental',
  ionianSharp2Sharp5: 'Ionian #2 #5',
  locrianDoubleFlat3DoubleFlat7: 'Locrian \u266D\u266D3 \u266D\u266D7',
};

export const MODE_TO_SLUG: Record<string, string> = {
  ionian: 'ionian',
  dorian: 'dorian',
  phrygian: 'phrygian',
  lydian: 'lydian',
  mixolydian: 'mixolydian',
  aeolian: 'aeolian',
  locrian: 'locrian',
  harmonicMinor: 'harmonic-minor',
  locrianNat6: 'locrian-nat6',
  ionianSharp5: 'ionian-sharp5',
  dorianSharp4: 'dorian-sharp4',
  phrygianDominant: 'phrygian-dominant',
  lydianSharp2: 'lydian-sharp2',
  alteredDiminished: 'altered-diminished',
  melodicMinor: 'melodic-minor',
  dorianFlat2: 'dorian-flat2',
  lydianAugmented: 'lydian-augmented',
  lydianDominant: 'lydian-dominant',
  mixolydianFlat6: 'mixolydian-flat6',
  locrianNat2: 'locrian-nat2',
  altered: 'altered',
  harmonicMajor: 'harmonic-major',
  dorianFlat5: 'dorian-flat5',
  alteredDominantNat5: 'altered-dominant-nat5',
  melodicMinorSharp4: 'melodic-minor-sharp4',
  mixolydianFlat2: 'mixolydian-flat2',
  lydianAugmentedSharp2: 'lydian-augmented-sharp2',
  locrianDoubleFlat7: 'locrian-double-flat7',
  doubleHarmonicMajor: 'double-harmonic-major',
  lydianSharp2Sharp6: 'lydian-sharp2-sharp6',
  ultraphrygian: 'ultraphrygian',
  doubleHarmonicMinor: 'double-harmonic-minor',
  oriental: 'oriental',
  ionianSharp2Sharp5: 'ionian-sharp2-sharp5',
  locrianDoubleFlat3DoubleFlat7: 'locrian-double-flat3-double-flat7',
};

const FAMILY_PRIORITY: Record<string, number> = {
  Ionian: 0,
  'Harmonic Minor': 1,
  'Melodic Minor': 2,
  'Harmonic Major': 3,
  'Double Harmonic Major': 4,
};

// ── Types ────────────────────────────────────────────────────────────────

export interface ChordInterpretation {
  family: string;
  sessionMode: string;
  chordRootMode: string;
  parentOffset: number;
}

export interface ChordInsight {
  degreeName: string;
  hybrid: string;
  quality: string;
  chordLabel: string;
  rootLetter: string;
  noteNames: string[];
  intervals: string;
  color: string;
  sessionMode: string | null;
  chordRootMode: string;
  parentKeyLetter: string;
  parentMode: string;
  isSessionParent: boolean;
  description: string;
  alternatives: ChordInterpretation[];
  // UNISON enrichments (available after Analyze)
  romanNumeral?: string;
  isDiatonic?: boolean;
  modalInterchange?: ModalInterchangeAnnotation | null;
  sourceMode?: string;
}

// ── Interpretation finder ────────────────────────────────────────────────

export function findAllInterpretations(
  degreeName: string,
): ChordInterpretation[] {
  const { degree, modifier } = chordDeg(degreeName);
  const quality = unstepChord(degreeName);
  const qualityIntervals = CHORDS[quality];
  if (!qualityIntervals || degree === 0) return [];

  const ionianRef = MODES.ionian;
  const chordOffset = (ionianRef[degree - 1] + modifier + 12) % 12;
  const chordTones = qualityIntervals.map(
    (qi) => (((chordOffset + qi) % 12) + 12) % 12,
  );

  const results: ChordInterpretation[] = [];

  for (const [familyName, familyIntervals] of Object.entries(
    FAMILY_INTERVALS,
  )) {
    for (let m = 0; m < 7; m++) {
      const scalePcs = familyIntervals.map(
        (i) => (i - familyIntervals[m] + 12) % 12,
      );
      const chordDegIdx = scalePcs.indexOf(chordOffset);
      if (chordDegIdx < 0) continue;

      const scaleSet = new Set(scalePcs);
      if (!chordTones.every((t) => scaleSet.has(t))) continue;

      results.push({
        family: familyName,
        sessionMode: FAMILY_MODES[familyName][m],
        chordRootMode: FAMILY_MODES[familyName][chordDegIdx],
        parentOffset: familyIntervals[m],
      });
    }
  }

  results.sort(
    (a, b) =>
      (FAMILY_PRIORITY[a.family] ?? 99) - (FAMILY_PRIORITY[b.family] ?? 99),
  );
  return results;
}

// ── Enriched description helper ──────────────────────────────────────────

export function getEnrichedDescription(chord: ChordInsight): string {
  if (chord.modalInterchange) {
    switch (chord.modalInterchange.type) {
      case 'borrowed':
        return `Borrowed from ${chord.modalInterchange.sourceModeDisplay ?? chord.sourceMode ?? 'parallel mode'}`;
      case 'secondary-dominant':
        return `Secondary dominant — resolves to ${chord.modalInterchange.secondaryTarget ?? 'target'}`;
      case 'secondary-leading-tone':
        return `Secondary leading tone — resolves to ${chord.modalInterchange.secondaryTarget ?? 'target'}`;
      case 'mode-mixture':
        return 'Mode mixture — blending parallel tonalities';
    }
  }
  if (chord.isDiatonic === false) {
    return 'Chromatic chord — outside the diatonic set';
  }
  return chord.description;
}

// ── noteNameInKey re-export (for sub-components) ─────────────────────────

export { noteNameInKey };
