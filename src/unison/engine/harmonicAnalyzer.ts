/**
 * Enriches existing ChordRegions with Hybrid Numbers, roman numerals,
 * and UNISON analysis metadata. Does NOT re-detect chords — reads
 * from the existing prismSlice chord derivation pipeline.
 */

import { detectChordWithInversion } from '@/daw/prism-engine';
import type { MidiNoteEvent } from '@/daw/prism-engine/types';
import type { ChordRegion } from '@/daw/store/prismSlice';
import type {
  KeyDetection,
  UnisonChordRegion,
  ModalInterchangeAnnotation,
} from '../types/schema';
import { isDiatonic } from './diatonicChecker';
import { getBestBorrowedSource } from './modalInterchange';
import { detectSecondaryDominants } from './secondaryDominant';

// ── Degree → Roman Numeral ─────────────────────────────────────────────────

const DEGREE_TO_ROMAN: Record<number, string> = {
  1: 'I',
  2: 'II',
  3: 'III',
  4: 'IV',
  5: 'V',
  6: 'VI',
  7: 'VII',
};

const QUALITY_SUFFIX: Record<string, string> = {
  major: '',
  minor: 'm',
  diminished: 'dim',
  augmented: 'aug',
  dominant7: '7',
  major7: 'maj7',
  minor7: 'm7',
  minor7b5: 'm7b5',
  diminished7: 'dim7',
  dominant9: '9',
  major9: 'maj9',
  minor9: 'm9',
  dominant11: '11',
  minor11: 'm11',
  dominant13: '13',
  minor13: 'm13',
  major13: 'maj13',
  sus2: 'sus2',
  sus4: 'sus4',
  minormajor7: 'mMaj7',
};

// Abbreviated quality → long form for hybridName normalization
const ABBREV_TO_LONG: Record<string, string> = {
  maj: 'major',
  min: 'minor',
  dom: 'dominant',
  dim: 'diminished',
  aug: 'augmented',
  maj7: 'major7',
  min7: 'minor7',
  dom7: 'dominant7',
  dom9: 'dominant9',
  maj9: 'major9',
  min9: 'minor9',
  min7b5: 'minor7b5',
  dim7: 'diminished7',
};

// ── Core ───────────────────────────────────────────────────────────────────

/**
 * Enrich existing ChordRegions with UNISON analysis metadata.
 *
 * @param regions   Chord regions from the prism detection pipeline
 * @param key       Detected or user-set key
 * @param allEvents Optional MIDI events for inversion/bass detection.
 *                  When provided, events within each region's tick range
 *                  are used to determine voicing inversion and bass note.
 */
export function analyzeHarmony(
  regions: ChordRegion[],
  key: KeyDetection,
  allEvents: MidiNoteEvent[] = [],
): UnisonChordRegion[] {
  // Pass 1: Build base chord regions with degree, quality, roman numerals
  const chords: UnisonChordRegion[] = regions.map((region) => {
    const parsed = parseRegion(region);
    const romanNumeral = buildRomanNumeral(parsed.degree, parsed.quality);

    // Determine voicing notes for inversion detection
    const voicing = region.midis?.length
      ? region.midis
      : allEvents
          .filter(
            (e) =>
              e.startTick >= region.startTick && e.startTick < region.endTick,
          )
          .map((e) => e.note);

    let inversion = 0;
    let bassNote: number | undefined;

    if (voicing.length >= 2) {
      const match = detectChordWithInversion(voicing);
      if (match) {
        inversion = match.inversion;
        bassNote = match.bassNote;
      }
    }

    return {
      id: region.id,
      startTick: region.startTick,
      endTick: region.endTick,
      rootPc: parsed.rootPc,
      quality: parsed.quality,
      noteName: region.noteName,
      degree: parsed.degree,
      hybridName: `${parsed.degree} ${parsed.quality}`,
      romanNumeral,
      color: region.color,
      inversion,
      bassNote,
      confidence: 1.0,
    };
  });

  // Pass 2: Annotate modal interchange
  return annotateModalInterchange(chords, key);
}

// ── Parsing ────────────────────────────────────────────────────────────────

interface ParsedRegion {
  degree: string;
  quality: string;
  rootPc: number;
}

/**
 * Parse degree and quality from a ChordRegion's name fields.
 *
 * The region may have:
 *   - degreeKey: "1 major" (long form, from generated progressions)
 *   - name: "1 maj" or "b3 dom7" (abbreviated, from detection)
 *   - noteName: "C maj" (absolute name)
 */
function parseRegion(region: ChordRegion): ParsedRegion {
  // Prefer degreeKey (long form, most reliable)
  if (region.degreeKey) {
    const spaceIdx = region.degreeKey.indexOf(' ');
    if (spaceIdx > 0) {
      return {
        degree: region.degreeKey.slice(0, spaceIdx),
        quality: region.degreeKey.slice(spaceIdx + 1),
        rootPc: extractRootPc(region.noteName),
      };
    }
  }

  // Fall back to name (abbreviated form)
  const spaceIdx = region.name.indexOf(' ');
  if (spaceIdx > 0) {
    const degreeStr = region.name.slice(0, spaceIdx);
    const abbrevQuality = region.name.slice(spaceIdx + 1);
    const quality = expandAbbreviation(abbrevQuality);
    return {
      degree: degreeStr,
      quality,
      rootPc: extractRootPc(region.noteName),
    };
  }

  // Bare name (e.g., just a note letter like "C")
  return {
    degree: '1',
    quality: 'major',
    rootPc: extractRootPc(region.noteName || region.name),
  };
}

function expandAbbreviation(abbrev: string): string {
  return ABBREV_TO_LONG[abbrev] ?? abbrev;
}

// ── Note name → pitch class ────────────────────────────────────────────────

const NOTE_PC: Record<string, number> = {
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

function extractRootPc(noteName: string): number {
  if (!noteName) return 0;
  const trimmed = noteName.trim();
  // Try two-char note name first (e.g., "Bb", "F#")
  const twoChar = trimmed.slice(0, 2);
  if (NOTE_PC[twoChar] !== undefined) return NOTE_PC[twoChar];
  // Try one-char note name
  const oneChar = trimmed[0];
  if (NOTE_PC[oneChar] !== undefined) return NOTE_PC[oneChar];
  return 0;
}

// ── Roman Numeral ──────────────────────────────────────────────────────────

function buildRomanNumeral(degree: string, quality: string): string {
  let prefix = '';
  let degNum: number;

  if (degree[0] === 'b') {
    prefix = 'b';
    degNum = parseInt(degree.slice(1), 10);
  } else if (degree[0] === '#') {
    prefix = '#';
    degNum = parseInt(degree.slice(1), 10);
  } else {
    degNum = parseInt(degree, 10);
  }

  const roman = DEGREE_TO_ROMAN[degNum] ?? degree;
  const suffix = QUALITY_SUFFIX[quality] ?? '';

  // Minor qualities use lowercase roman numerals
  const isMinor =
    quality.startsWith('minor') ||
    quality === 'diminished' ||
    quality === 'diminished7';
  const romanCase = isMinor ? roman.toLowerCase() : roman;

  return `${prefix}${romanCase}${suffix}`;
}

// ── Modal Interchange Annotation (Pass 2) ────────────────────────────────────

function annotateModalInterchange(
  chords: UnisonChordRegion[],
  key: KeyDetection,
): UnisonChordRegion[] {
  if (chords.length === 0) return chords;

  // Batch secondary dominant detection
  const secDomResults = detectSecondaryDominants(
    chords.map((c) => ({ rootPc: c.rootPc, quality: c.quality })),
    key.rootPc,
    key.mode,
  );

  return chords.map((chord, i) => {
    const diatonic = isDiatonic(
      chord.rootPc,
      chord.quality,
      key.rootPc,
      key.mode,
    );

    if (diatonic) {
      return { ...chord, isDiatonic: true, modalInterchange: null };
    }

    // Non-diatonic: check secondary dominant first (higher priority when resolved)
    const secDom = secDomResults[i];
    if (secDom && secDom.resolved) {
      const annotation: ModalInterchangeAnnotation = {
        type: secDom.type,
        secondaryTarget: secDom.label,
        resolved: secDom.resolved,
        confidence: 1.0,
      };
      return { ...chord, isDiatonic: false, modalInterchange: annotation };
    }

    // Try borrowed chord source
    const borrowed = getBestBorrowedSource(
      chord.rootPc,
      chord.quality,
      key.rootPc,
      key.mode,
    );

    if (borrowed) {
      const annotation: ModalInterchangeAnnotation = {
        type: 'borrowed',
        sourceMode: borrowed.sourceMode,
        sourceModeDisplay: borrowed.sourceModeDisplay,
        sourceModeFamily: borrowed.sourceModeFamily,
        confidence: borrowed.confidence,
      };
      return {
        ...chord,
        isDiatonic: false,
        modalInterchange: annotation,
        sourceMode: borrowed.sourceMode,
      };
    }

    // Unresolved secondary dominant (lower priority than borrowed)
    if (secDom) {
      const annotation: ModalInterchangeAnnotation = {
        type: secDom.type,
        secondaryTarget: secDom.label,
        resolved: false,
        confidence: 0.7,
      };
      return { ...chord, isDiatonic: false, modalInterchange: annotation };
    }

    // Truly chromatic — no known source
    return { ...chord, isDiatonic: false, modalInterchange: null };
  });
}
