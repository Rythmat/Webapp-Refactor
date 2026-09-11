/**
 * Enriches existing ChordRegions with Hybrid Numbers and UNISON analysis
 * metadata. Does NOT re-detect chords — reads
 * from the existing prismSlice chord derivation pipeline.
 */

import { noteNameToPitchClass } from '@/curriculum/engine/genreGeneration/enharmonicEngine';
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
  // Pass 1: Build base chord regions with degree, quality and hybrid name
  const chords: UnisonChordRegion[] = regions.map((region) => {
    const parsed = parseRegion(region);

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

function extractRootPc(noteName: string): number {
  if (!noteName) return 0;
  // Leading note name of a chord label: "Bb maj", "F# dom7", "Cb min", "Ebb dim".
  const root = noteName.trim().match(/^[A-G](?:bb|##|b|#|𝄫|𝄪|♭|♯)?/u)?.[0];
  return root ? (noteNameToPitchClass(root) ?? 0) : 0;
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
