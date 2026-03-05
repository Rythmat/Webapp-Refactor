/* eslint-disable sonarjs/cognitive-complexity */
/* eslint-disable sonarjs/no-duplicated-branches */
/* eslint-disable tailwindcss/classnames-order */
/* eslint-disable tailwindcss/enforces-shorthand */
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, ChevronDown, Lightbulb } from 'lucide-react';
import { useStore } from '@/daw/store';
import {
  NOTES,
  CHORDS,
  MODES,
  unstepChord,
  degreeMidi,
  generateChord,
  noteNameLetter,
  noteNameInKey,
  detectChordWithInversion,
  KEY_COLORS,
  chordDeg,
  CHORD_COLORS,
  getChordColor,
} from '@prism/engine';
import { LearnRoutes } from '@/constants/routes';
import { keyLabelToUrlParam } from '@/lib/musicKeyUrl';
import { getChordTheory } from './chordTheoryMap';

// ── Helpers ──────────────────────────────────────────────────────────────

const ROOT_TO_KEY_INDEX = [1, 8, 3, 10, 5, 12, 7, 2, 9, 4, 11, 6];

const QUALITY_DISPLAY: Record<string, string> = {
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

function formatQuality(quality: string): string {
  return (
    QUALITY_DISPLAY[quality] ??
    quality
      .replace(/dominant/g, 'dom')
      .replace(/diminished/g, 'dim')
      .replace(/minor/g, 'min')
      .replace(/major/g, 'maj')
  );
}

function degreeToHybrid(degreeName: string): string {
  const deg = chordDeg(degreeName);
  const quality = unstepChord(degreeName);
  const prefix = deg.modifier === -1 ? '\u266D' : deg.modifier === 1 ? '#' : '';
  return `${prefix}${deg.degree} ${formatQuality(quality)}`;
}

function intervalsToString(intervals: number[]): string {
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

function rgbString(r: number, g: number, b: number): string {
  return `rgb(${r},${g},${b})`;
}

/** Semitone offset from a mode's root to its parent scale root, plus family name. */
const PARENT_SCALE_INFO: Record<string, { offset: number; family: string }> = {
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

/** Scale degree intervals for each family (used to find chord root's mode within parent scale) */
const FAMILY_INTERVALS: Record<string, number[]> = {
  Ionian: [0, 2, 4, 5, 7, 9, 11],
  'Harmonic Minor': [0, 2, 3, 5, 7, 8, 11],
  'Melodic Minor': [0, 2, 3, 5, 7, 9, 11],
  'Harmonic Major': [0, 2, 4, 5, 7, 8, 11],
  'Double Harmonic Major': [0, 1, 4, 5, 7, 8, 11],
};

/** Mode names for each degree of each scale family */
const FAMILY_MODES: Record<string, string[]> = {
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

/** Display names for all modes across all families */
const MODE_DISPLAY: Record<string, string> = {
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

/** URL slugs for Learn route */
const MODE_TO_SLUG: Record<string, string> = {
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

/** Family sort order: more common families first */
const FAMILY_PRIORITY: Record<string, number> = {
  Ionian: 0,
  'Harmonic Minor': 1,
  'Melodic Minor': 2,
  'Harmonic Major': 3,
  'Double Harmonic Major': 4,
};

interface ChordInterpretation {
  family: string;
  sessionMode: string; // mode the session key would be in
  chordRootMode: string; // mode the chord root would be in
  parentOffset: number; // semitones from session key to parent root
}

/**
 * Given a degree-qualified chord name, finds ALL scale families × modes
 * where this chord naturally occurs, sorted by commonality.
 */
function findAllInterpretations(degreeName: string): ChordInterpretation[] {
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

// ── Types ────────────────────────────────────────────────────────────────

interface ChordInsight {
  degreeName: string;
  hybrid: string;
  quality: string;
  chordLabel: string; // e.g. "C major"
  rootLetter: string; // chord root letter for Learn link
  noteNames: string[]; // e.g. ["C", "E", "G"]
  intervals: string; // e.g. "R 3 5"
  color: string; // CSS color (per-chord, mode-based)
  sessionMode: string | null; // session key's mode from chord's perspective (e.g. "lydian" for E when chord is B maj7)
  chordRootMode: string; // chord root's native mode from quality (e.g. "ionian" for maj7)
  parentKeyLetter: string; // parent scale root letter (e.g. "G")
  parentMode: string; // parent scale mode (first mode of family, e.g. "ionian")
  isSessionParent: boolean; // true when session key = parent key (offset === 0)
  description: string; // quality-based theory blurb
  alternatives: ChordInterpretation[]; // non-primary interpretations, sorted by commonality
}

// ── Component ────────────────────────────────────────────────────────────

export function InsightContent() {
  const stringSeq = useStore((s) => s.stringSeq);
  const rootNote = useStore((s) => s.rootNote);
  const hwActiveNotes = useStore((s) => s.hwActiveNotes);

  const keyLetter = rootNote !== null ? NOTES[rootNote] : null;

  const [showLiveAlts, setShowLiveAlts] = useState(false);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  // ── Live MIDI chord detection ──

  const liveChord = useMemo(() => {
    if (hwActiveNotes.size < 2) return null;

    const sorted = [...hwActiveNotes].sort((a, b) => a - b);
    const match = detectChordWithInversion(sorted);
    if (!match) return null;

    const { quality, rootPc, inversion } = match;
    const rootLetter =
      rootNote !== null
        ? noteNameInKey(rootPc, rootNote)
        : noteNameLetter(rootPc + 48);
    const intervals = CHORDS[quality];

    // Build chord label with ordinal inversion labels
    const INVERSION_LABELS = [
      '',
      '1st Inversion',
      '2nd Inversion',
      '3rd Inversion',
    ];
    const chordLabel =
      inversion > 0
        ? `${rootLetter} ${formatQuality(quality)} (${INVERSION_LABELS[inversion]})`
        : `${rootLetter} ${formatQuality(quality)}`;

    let hybrid: string | null = null;
    let color: string | null = null;
    let sessionMode: string | null = null;
    let chordRootMode: string | null = null;
    let parentKeyLetter: string | null = null;
    let parentMode: string | null = null;
    let isSessionParent = true;
    let alternatives: ChordInterpretation[] = [];

    if (rootNote !== null) {
      // Degree detection uses the true chord root, not the bass note
      const diff = (rootPc - rootNote + 12) % 12;
      const ionian = MODES.ionian;
      let degree = -1;
      let modifier = 0;

      for (let i = 0; i < ionian.length; i++) {
        if (ionian[i] === diff) {
          degree = i + 1;
          break;
        }
      }
      if (degree < 0) {
        let flatDeg = -1,
          sharpDeg = -1;
        for (let i = 0; i < ionian.length; i++) {
          if (ionian[i] === diff + 1 && flatDeg < 0) flatDeg = i + 1;
          if (ionian[i] === diff - 1 && sharpDeg < 0) sharpDeg = i + 1;
        }
        const flatKey = flatDeg > 0 ? `b${flatDeg} ${quality}` : '';
        const sharpKey = sharpDeg > 0 ? `#${sharpDeg} ${quality}` : '';
        if (flatKey && CHORD_COLORS[flatKey] !== undefined) {
          degree = flatDeg;
          modifier = -1;
        } else if (sharpKey && CHORD_COLORS[sharpKey] !== undefined) {
          degree = sharpDeg;
          modifier = 1;
        } else if (flatDeg > 0) {
          degree = flatDeg;
          modifier = -1;
        } else if (sharpDeg > 0) {
          degree = sharpDeg;
          modifier = 1;
        }
      }

      if (degree > 0) {
        const prefix = modifier === -1 ? '\u266D' : modifier === 1 ? '#' : '';
        hybrid = `${prefix}${degree} ${formatQuality(quality)}`;

        const degPrefix = modifier === -1 ? 'b' : modifier === 1 ? '#' : '';
        const degreeName = `${degPrefix}${degree} ${quality}`;
        const rootMidi = rootNote + 48;
        const [r, g, b] = getChordColor(degreeName, rootMidi);
        color = rgbString(r, g, b);

        // Chord root's mode from its quality (maj7 → ionian, min7 → dorian, etc.)
        chordRootMode = getChordTheory(quality).mode;

        // Derive parent scale from the chord's mode
        const chordModeInfo = PARENT_SCALE_INFO[chordRootMode];
        const chordParentFamily = chordModeInfo?.family ?? 'Ionian';
        const chordParentRootPc = chordModeInfo
          ? (rootPc + chordModeInfo.offset) % 12
          : rootPc;

        // Session key's mode from chord's perspective
        const sessionInterval = (rootNote - chordParentRootPc + 12) % 12;
        const chordFamilyIntervals = FAMILY_INTERVALS[chordParentFamily];
        const sessionDegIdx =
          chordFamilyIntervals?.indexOf(sessionInterval) ?? -1;
        sessionMode =
          sessionDegIdx >= 0
            ? (FAMILY_MODES[chordParentFamily]?.[sessionDegIdx] ?? null)
            : null;

        // Parent info
        const isChordParent = !chordModeInfo || chordModeInfo.offset === 0;
        isSessionParent = isChordParent || chordParentRootPc === rootNote;
        parentKeyLetter = noteNameInKey(chordParentRootPc, rootNote);
        parentMode = FAMILY_MODES[chordParentFamily]?.[0] ?? chordRootMode;

        // All family interpretations (excluding primary)
        const allInterps = findAllInterpretations(degreeName);
        alternatives = allInterps.filter(
          (i) => i.chordRootMode !== chordRootMode,
        );
      }
    }

    return {
      chordLabel,
      hybrid,
      rootLetter,
      noteNames: sorted.map((n) => noteNameInKey(n % 12, rootNote ?? 0)),
      intervals: intervals ? intervalsToString(intervals) : '',
      color,
      sessionMode,
      chordRootMode,
      parentKeyLetter,
      parentMode,
      isSessionParent,
      alternatives,
    };
  }, [hwActiveNotes, rootNote]);

  // ── Progression insights ──

  const insights = useMemo(() => {
    if (stringSeq.length === 0 || rootNote === null) return [];

    const rootMidi = rootNote + 48;
    const seen = new Set<string>();
    const results: ChordInsight[] = [];

    for (const degreeName of stringSeq) {
      if (seen.has(degreeName)) continue;
      seen.add(degreeName);

      const quality = unstepChord(degreeName);
      const bassMidi = degreeMidi(rootMidi, degreeName);
      const pitchedNotes = generateChord(bassMidi, quality);
      const noteNames = pitchedNotes.map((n) =>
        noteNameInKey(n % 12, rootNote),
      );
      const rootLetter = noteNameInKey(bassMidi % 12, rootNote);
      const intervals = CHORDS[quality];

      // Per-chord color via engine's circle-of-fifths rotation
      const [r, g, b] = getChordColor(degreeName, rootMidi);

      // Chord root's mode from its quality (maj7 → ionian, min7 → dorian, etc.)
      const chordRootPc = bassMidi % 12;
      const chordRootMode = getChordTheory(quality).mode;

      // Derive parent scale from the chord's mode
      const chordModeInfo = PARENT_SCALE_INFO[chordRootMode];
      const chordParentFamily = chordModeInfo?.family ?? 'Ionian';
      const chordParentRootPc = chordModeInfo
        ? (chordRootPc + chordModeInfo.offset) % 12
        : chordRootPc;

      // Session key's mode from chord's perspective
      const sessionInterval = (rootNote - chordParentRootPc + 12) % 12;
      const chordFamilyIntervals = FAMILY_INTERVALS[chordParentFamily];
      const sessionDegIdx =
        chordFamilyIntervals?.indexOf(sessionInterval) ?? -1;
      const sessionMode =
        sessionDegIdx >= 0
          ? (FAMILY_MODES[chordParentFamily]?.[sessionDegIdx] ?? null)
          : null;

      // Parent info
      const isChordParent = !chordModeInfo || chordModeInfo.offset === 0;
      const isSessionParent = isChordParent || chordParentRootPc === rootNote;
      const parentKeyLetter = noteNameInKey(chordParentRootPc, rootNote);
      const parentMode = FAMILY_MODES[chordParentFamily]?.[0] ?? chordRootMode;

      // All family interpretations (excluding primary)
      const allInterps = findAllInterpretations(degreeName);
      const alternatives = allInterps.filter(
        (i) => i.chordRootMode !== chordRootMode,
      );

      results.push({
        degreeName,
        hybrid: degreeToHybrid(degreeName),
        quality,
        chordLabel: `${rootLetter} ${formatQuality(quality)}`,
        rootLetter,
        noteNames,
        intervals: intervals ? intervalsToString(intervals) : '',
        color: rgbString(r, g, b),
        sessionMode,
        chordRootMode,
        parentKeyLetter,
        parentMode,
        isSessionParent,
        description: getChordTheory(quality).description,
        alternatives,
      });
    }

    return results;
  }, [stringSeq, rootNote]);

  const hasProgression = stringSeq.length > 0 && rootNote !== null;
  const keyIdx = hasProgression ? ROOT_TO_KEY_INDEX[rootNote] : 0;
  const [kr, kg, kb] = hasProgression
    ? KEY_COLORS[keyIdx]
    : ([255, 255, 255] as const);

  return (
    <div className="flex flex-col gap-0.5">
      {/* Now Playing — always visible */}
      <div
        className="flex flex-col gap-1.5 px-3 py-2.5 border-b"
        style={{ borderColor: 'var(--color-border)', minHeight: 120 }}
      >
        <div className="flex items-center gap-1.5">
          {liveChord?.color && (
            <div
              className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{ backgroundColor: liveChord.color }}
            />
          )}
          <span
            className="text-[10px] uppercase tracking-wider font-medium"
            style={{ color: 'var(--color-accent)' }}
          >
            Now Playing
          </span>
        </div>
        {liveChord ? (
          <>
            <div className="flex items-center gap-1.5">
              <span
                className="text-[11px] font-semibold"
                style={{ color: 'var(--color-text)' }}
              >
                {liveChord.chordLabel}
              </span>
              {liveChord.hybrid && (
                <span
                  className="text-[10px]"
                  style={{ color: 'var(--color-text-dim)' }}
                >
                  {liveChord.hybrid}
                </span>
              )}
            </div>
            {liveChord.intervals && (
              <div className="flex gap-1 flex-wrap">
                {liveChord.intervals.split(' ').map((interval, i) => (
                  <span
                    key={i}
                    className="text-[9px] font-mono px-1 py-0.5 rounded"
                    style={{
                      backgroundColor: 'var(--color-surface-2)',
                      color:
                        interval === 'R'
                          ? 'var(--color-accent)'
                          : 'var(--color-text-dim)',
                    }}
                  >
                    {interval}
                  </span>
                ))}
              </div>
            )}
            <div
              className="text-[9px]"
              style={{ color: 'var(--color-text-dim)' }}
            >
              Notes: {liveChord.noteNames.join(' \u2013 ')}
            </div>
            {liveChord.chordRootMode && (
              <div
                className="text-[9px] leading-snug"
                style={{ color: 'var(--color-text-dim)' }}
              >
                {liveChord.rootLetter}{' '}
                {MODE_DISPLAY[liveChord.chordRootMode] ??
                  liveChord.chordRootMode}
                {liveChord.sessionMode &&
                  keyLetter &&
                  !(
                    liveChord.sessionMode === liveChord.chordRootMode &&
                    liveChord.rootLetter === keyLetter
                  ) && (
                    <>
                      {' '}
                      · {keyLetter}{' '}
                      {MODE_DISPLAY[liveChord.sessionMode] ??
                        liveChord.sessionMode}
                    </>
                  )}
                {!liveChord.isSessionParent &&
                  liveChord.parentKeyLetter &&
                  liveChord.parentMode && (
                    <>
                      {' '}
                      · Parent: {liveChord.parentKeyLetter}{' '}
                      {MODE_DISPLAY[liveChord.parentMode] ??
                        liveChord.parentMode}
                    </>
                  )}
              </div>
            )}
            {liveChord.alternatives.length > 0 && (
              <div className="flex flex-col gap-0.5 mt-0.5">
                <button
                  type="button"
                  onClick={() => setShowLiveAlts((v) => !v)}
                  className="flex items-center gap-1 text-[9px] font-medium"
                  style={{
                    color: 'var(--color-text-dim)',
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                  }}
                >
                  <ChevronDown
                    size={10}
                    strokeWidth={2}
                    style={{
                      transition: 'transform 150ms',
                      transform: showLiveAlts
                        ? 'rotate(180deg)'
                        : 'rotate(0deg)',
                    }}
                  />
                  Also found in {liveChord.alternatives.length} scale
                  {liveChord.alternatives.length > 1 ? 's' : ''}
                </button>
                {showLiveAlts &&
                  liveChord.alternatives.map((alt, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-1.5 pl-3 text-[9px] leading-snug"
                      style={{ color: 'var(--color-text-dim)', opacity: 0.7 }}
                    >
                      <span>
                        {liveChord.rootLetter}{' '}
                        {MODE_DISPLAY[alt.chordRootMode] ?? alt.chordRootMode} (
                        {alt.family})
                      </span>
                      <Link
                        to={LearnRoutes.lesson({
                          mode:
                            MODE_TO_SLUG[alt.chordRootMode] ??
                            alt.chordRootMode,
                          key: keyLabelToUrlParam(liveChord.rootLetter),
                        })}
                        className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[8px] font-medium transition-colors shrink-0"
                        style={{
                          backgroundColor: 'var(--color-surface-2)',
                          color: 'var(--color-accent)',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor =
                            'rgba(126,207,207,0.15)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor =
                            'var(--color-surface-2)';
                        }}
                      >
                        <BookOpen size={8} strokeWidth={2} />
                        Learn
                      </Link>
                    </div>
                  ))}
              </div>
            )}
            {liveChord.chordRootMode && liveChord.rootLetter && (
              <Link
                to={LearnRoutes.lesson({
                  mode:
                    MODE_TO_SLUG[liveChord.chordRootMode] ??
                    liveChord.chordRootMode,
                  key: keyLabelToUrlParam(liveChord.rootLetter),
                })}
                className="flex items-center gap-1 self-start mt-0.5 px-1.5 py-0.5 rounded text-[9px] font-medium transition-colors"
                style={{
                  backgroundColor: 'var(--color-surface-3)',
                  color: 'var(--color-accent)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor =
                    'rgba(126,207,207,0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor =
                    'var(--color-surface-3)';
                }}
              >
                <BookOpen size={9} strokeWidth={2} />
                Learn {liveChord.rootLetter}{' '}
                {MODE_DISPLAY[liveChord.chordRootMode] ??
                  liveChord.chordRootMode}
              </Link>
            )}
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <span
              className="text-[10px]"
              style={{ color: 'var(--color-text-dim)' }}
            >
              Play a chord to see analysis
            </span>
          </div>
        )}
      </div>

      {/* Progression: key indicator + chord cards */}
      {hasProgression ? (
        <>
          {/* Key indicator */}
          <div
            className="flex items-center gap-2 px-3 py-2 border-b"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <div
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: rgbString(kr, kg, kb) }}
            />
            <span
              className="text-[11px] font-semibold"
              style={{ color: 'var(--color-text)' }}
            >
              Key of {keyLetter}
            </span>
          </div>

          {/* Chord cards */}
          {insights.map((chord) => (
            <div
              key={chord.degreeName}
              className="flex flex-col gap-1.5 px-3 py-2.5 border-b"
              style={{ borderColor: 'var(--color-border)' }}
            >
              {/* Title row */}
              <div className="flex items-center gap-1.5">
                <div
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ backgroundColor: chord.color }}
                />
                <span
                  className="text-[11px] font-semibold"
                  style={{ color: 'var(--color-text)' }}
                >
                  {chord.hybrid}
                </span>
                <span
                  className="text-[10px]"
                  style={{ color: 'var(--color-text-dim)' }}
                >
                  {chord.chordLabel}
                </span>
              </div>

              {/* Intervals */}
              {chord.intervals && (
                <div className="flex gap-1 flex-wrap">
                  {chord.intervals.split(' ').map((interval, i) => (
                    <span
                      key={i}
                      className="text-[9px] font-mono px-1 py-0.5 rounded"
                      style={{
                        backgroundColor: 'var(--color-surface-2)',
                        color:
                          interval === 'R'
                            ? 'var(--color-accent)'
                            : 'var(--color-text-dim)',
                      }}
                    >
                      {interval}
                    </span>
                  ))}
                </div>
              )}

              {/* Note names */}
              <div
                className="text-[9px]"
                style={{ color: 'var(--color-text-dim)' }}
              >
                Notes: {chord.noteNames.join(' \u2013 ')}
              </div>

              {/* Theory description */}
              <div
                className="text-[9px] leading-snug"
                style={{ color: 'var(--color-text-dim)' }}
              >
                {chord.description}
              </div>

              {/* Mode info */}
              <div
                className="text-[9px] leading-snug"
                style={{ color: 'var(--color-text-dim)' }}
              >
                {chord.rootLetter}{' '}
                {MODE_DISPLAY[chord.chordRootMode] ?? chord.chordRootMode}
                {chord.sessionMode &&
                  keyLetter &&
                  !(
                    chord.sessionMode === chord.chordRootMode &&
                    chord.rootLetter === keyLetter
                  ) && (
                    <>
                      {' · '}
                      {keyLetter}{' '}
                      {MODE_DISPLAY[chord.sessionMode] ?? chord.sessionMode}
                    </>
                  )}
                {!chord.isSessionParent && (
                  <>
                    {' '}
                    · Parent: {chord.parentKeyLetter}{' '}
                    {MODE_DISPLAY[chord.parentMode] ?? chord.parentMode}
                  </>
                )}
              </div>

              {/* Alternative interpretations */}
              {chord.alternatives.length > 0 && (
                <div className="flex flex-col gap-0.5 mt-0.5">
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedCards((prev) => {
                        const next = new Set(prev);
                        if (next.has(chord.degreeName))
                          next.delete(chord.degreeName);
                        else next.add(chord.degreeName);
                        return next;
                      })
                    }
                    className="flex items-center gap-1 text-[9px] font-medium"
                    style={{
                      color: 'var(--color-text-dim)',
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      cursor: 'pointer',
                    }}
                  >
                    <ChevronDown
                      size={10}
                      strokeWidth={2}
                      style={{
                        transition: 'transform 150ms',
                        transform: expandedCards.has(chord.degreeName)
                          ? 'rotate(180deg)'
                          : 'rotate(0deg)',
                      }}
                    />
                    Also found in {chord.alternatives.length} scale
                    {chord.alternatives.length > 1 ? 's' : ''}
                  </button>
                  {expandedCards.has(chord.degreeName) &&
                    chord.alternatives.map((alt, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-1.5 pl-3 text-[9px] leading-snug"
                        style={{ color: 'var(--color-text-dim)', opacity: 0.7 }}
                      >
                        <span>
                          {chord.rootLetter}{' '}
                          {MODE_DISPLAY[alt.chordRootMode] ?? alt.chordRootMode}{' '}
                          ({alt.family})
                        </span>
                        <Link
                          to={LearnRoutes.lesson({
                            mode:
                              MODE_TO_SLUG[alt.chordRootMode] ??
                              alt.chordRootMode,
                            key: keyLabelToUrlParam(chord.rootLetter),
                          })}
                          className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[8px] font-medium transition-colors shrink-0"
                          style={{
                            backgroundColor: 'var(--color-surface-2)',
                            color: 'var(--color-accent)',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor =
                              'rgba(126,207,207,0.15)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor =
                              'var(--color-surface-2)';
                          }}
                        >
                          <BookOpen size={8} strokeWidth={2} />
                          Learn
                        </Link>
                      </div>
                    ))}
                </div>
              )}

              {/* Learn link */}
              <Link
                to={LearnRoutes.lesson({
                  mode:
                    MODE_TO_SLUG[chord.chordRootMode] ?? chord.chordRootMode,
                  key: keyLabelToUrlParam(chord.rootLetter),
                })}
                className="flex items-center gap-1 self-start mt-0.5 px-1.5 py-0.5 rounded text-[9px] font-medium transition-colors"
                style={{
                  backgroundColor: 'var(--color-surface-3)',
                  color: 'var(--color-accent)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor =
                    'rgba(126,207,207,0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor =
                    'var(--color-surface-3)';
                }}
              >
                <BookOpen size={9} strokeWidth={2} />
                Learn {chord.rootLetter}{' '}
                {MODE_DISPLAY[chord.chordRootMode] ?? chord.chordRootMode}
              </Link>
            </div>
          ))}
        </>
      ) : (
        <div className="flex flex-col items-center justify-center gap-3 px-4 py-10 text-center">
          <Lightbulb
            size={20}
            strokeWidth={1.5}
            style={{ color: 'var(--color-text-dim)' }}
          />
          <span
            className="text-[10px] leading-relaxed"
            style={{ color: 'var(--color-text-dim)' }}
          >
            Build a chord progression with Prism to see insights here
          </span>
        </div>
      )}
    </div>
  );
}
