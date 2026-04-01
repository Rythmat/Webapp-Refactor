/**
 * Lead Sheet ↔ UNISON converters.
 *
 * leadSheetToUnison(): Convert lead sheet state (ChordRegions + sections + repeats)
 *   into a full UnisonDocument via sessionToUnison().
 *
 * unisonToLeadSheet(): Extract ChordRegion[], sections, and repeats from a
 *   UnisonDocument for display in the lead sheet view.
 */

import type { ChordRegion } from '@/daw/store/prismSlice';
import type { LeadSheetSection, LeadSheetRepeat } from '@/daw/store/uiSlice';
import type {
  UnisonDocument,
  UnisonChordRegion,
  FormSection,
  SectionType,
} from '../types/schema';
import { sessionToUnison, type SessionSnapshot } from './sessionToUnison';

const PPQ = 480;

// ── Types ────────────────────────────────────────────────────────────────────

export interface LeadSheetToUnisonOptions {
  bpm?: number;
  rootNote?: number | null;
  mode?: string;
  timeSignatureNumerator?: number;
  timeSignatureDenominator?: number;
  title?: string;
}

export interface LeadSheetSnapshot {
  chordRegions: ChordRegion[];
  sections?: LeadSheetSection[];
  repeats?: LeadSheetRepeat[];
}

export interface LeadSheetData {
  chordRegions: ChordRegion[];
  sections: LeadSheetSection[];
  repeats: LeadSheetRepeat[];
}

// ── leadSheetToUnison ────────────────────────────────────────────────────────

/**
 * Convert lead sheet state into a UnisonDocument.
 *
 * Builds a SessionSnapshot from chord regions (no MIDI events — lead sheets
 * are chord-only), runs the full analysis pipeline, then attaches form data
 * from sections and repeats.
 */
export function leadSheetToUnison(
  leadSheet: LeadSheetSnapshot,
  options?: LeadSheetToUnisonOptions,
): UnisonDocument {
  const { chordRegions, sections = [], repeats = [] } = leadSheet;

  const bpm = options?.bpm ?? 120;
  const tsNum = options?.timeSignatureNumerator ?? 4;
  const tsDen = options?.timeSignatureDenominator ?? 4;
  const ticksPerMeasure = tsNum * PPQ;

  // Build a minimal SessionSnapshot (no MIDI tracks — lead sheets are chord-only)
  const snapshot: SessionSnapshot = {
    tracks: [],
    chordRegions,
    bpm,
    timeSignatureNumerator: tsNum,
    timeSignatureDenominator: tsDen,
    rootNote: options?.rootNote ?? null,
    mode: options?.mode ?? 'ionian',
    title: options?.title ?? 'Lead Sheet',
  };

  const doc = sessionToUnison(snapshot);
  doc.metadata.source = 'lead-sheet';

  // Build form analysis from sections and repeats
  if (sections.length > 0 || repeats.length > 0) {
    const totalTicks = chordRegions.reduce(
      (max, r) => Math.max(max, r.endTick),
      0,
    );
    const totalMeasures = Math.ceil(totalTicks / ticksPerMeasure);

    const formSections: FormSection[] = sections.map((sec, i) => {
      const nextSec = sections[i + 1];
      const startTick = sec.measureIdx * ticksPerMeasure;
      const endMeasure = nextSec ? nextSec.measureIdx : totalMeasures;
      const endTick = endMeasure * ticksPerMeasure;

      return {
        label: sec.label,
        type: labelToSectionType(sec.label),
        startTick,
        endTick,
        startMeasure: sec.measureIdx,
        endMeasure,
      };
    });

    doc.form = {
      sections: formSections,
      repeats: repeats.map((r) => ({
        startMeasure: r.startMeasure,
        endMeasure: r.endMeasure,
      })),
      formLabel: deriveFormLabel(formSections),
      totalMeasures,
    };
  }

  return doc;
}

// ── unisonToLeadSheet ────────────────────────────────────────────────────────

/**
 * Extract lead sheet data from a UnisonDocument.
 *
 * Converts UnisonChordRegion[] back to ChordRegion[] (store-compatible)
 * and extracts form sections/repeats for the lead sheet UI.
 */
export function unisonToLeadSheet(doc: UnisonDocument): LeadSheetData {
  const chordRegions: ChordRegion[] = doc.analysis.chordTimeline.map((chord) =>
    unisonChordToRegion(chord),
  );

  // Extract sections from form analysis
  const sections: LeadSheetSection[] = [];
  const repeats: LeadSheetRepeat[] = [];

  if (doc.form) {
    for (const sec of doc.form.sections) {
      sections.push({
        measureIdx: sec.startMeasure,
        label: sec.label,
      });
    }

    for (const rep of doc.form.repeats) {
      repeats.push({
        startMeasure: rep.startMeasure,
        endMeasure: rep.endMeasure,
      });
    }
  }

  return { chordRegions, sections, repeats };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Convert a UnisonChordRegion back to a store-compatible ChordRegion.
 */
function unisonChordToRegion(chord: UnisonChordRegion): ChordRegion {
  return {
    id: chord.id,
    startTick: chord.startTick,
    endTick: chord.endTick,
    name: chord.hybridName,
    noteName: chord.noteName,
    color: chord.color,
    confidence: chord.confidence,
  };
}

/**
 * Map a section label to a SectionType.
 */
function labelToSectionType(label: string): SectionType {
  const lower = label.toLowerCase().trim();
  const map: Record<string, SectionType> = {
    intro: 'intro',
    verse: 'verse',
    chorus: 'chorus',
    bridge: 'bridge',
    'pre-chorus': 'pre-chorus',
    prechorus: 'pre-chorus',
    outro: 'outro',
    solo: 'solo',
    interlude: 'interlude',
    coda: 'coda',
  };
  return map[lower] ?? 'custom';
}

/**
 * Derive a form label string (e.g., "AABA", "ABAB") from sections.
 */
function deriveFormLabel(sections: FormSection[]): string {
  if (sections.length === 0) return '';

  // Group consecutive sections by type and assign letters
  const typeToLetter = new Map<string, string>();
  let nextLetter = 65; // 'A'
  const letters: string[] = [];

  for (const sec of sections) {
    const key = `${sec.type}:${sec.label}`;
    if (!typeToLetter.has(key)) {
      typeToLetter.set(key, String.fromCharCode(nextLetter++));
    }
    letters.push(typeToLetter.get(key)!);
  }

  return letters.join('');
}
