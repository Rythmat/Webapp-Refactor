// ── LiveUnisonAnalyzer ─────────────────────────────────────────────────
// Incremental music analysis for real-time chord streams.
// Maintains a sliding window of recent chords and re-runs UNISON engine
// functions (key detection, harmonic analysis, progression matching)
// on each new chord push.
//
// Designed to be driven by the MusicIntelligenceBus liveChordStream.

import { CHORDS } from '@prism/engine';
import type { MidiNoteEvent } from '@/daw/prism-engine/types';
import type { ChordRegion } from '@/daw/store/prismSlice';
import type {
  KeyDetection,
  UnisonChordRegion,
  ProgressionMatchResult,
} from '../types/schema';
import { analyzeHarmony } from './harmonicAnalyzer';
import { detectKey } from './keyDetector';
import { matchProgressions } from './progressionMatcher';

// ── Types ────────────────────────────────────────────────────────────────

export interface LiveChordInput {
  rootPc: number;
  quality: string;
  confidence: number;
  timestamp: number;
}

export interface LiveAnalysisResult {
  /** Running key detection from the chord window. */
  key: KeyDetection | null;
  /** Recent chords with roman numerals (enriched by analyzeHarmony). */
  enrichedChords: UnisonChordRegion[];
  /** Best progression match, if any. */
  progressionMatch: ProgressionMatchResult | null;
  /** Number of chords in the analysis window. */
  windowSize: number;
}

// ── Constants ────────────────────────────────────────────────────────────

/** Max chords in the sliding window. */
const WINDOW_SIZE = 16;

/** Minimum chords required before running analysis. */
const MIN_CHORDS = 3;

/** PPQ used for synthetic tick positions. */
const PPQ = 480;

// ── Helpers ──────────────────────────────────────────────────────────────

const NOTE_NAMES = [
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

/** Convert a rootPc + quality into synthetic MidiNoteEvents for key detection. */
function chordToEvents(
  rootPc: number,
  quality: string,
  startTick: number,
): MidiNoteEvent[] {
  const intervals: number[] | undefined = CHORDS[quality];
  const base = 60 + rootPc;
  const notes = intervals ? intervals.map((iv: number) => base + iv) : [base];

  return notes.map((note) => ({
    note,
    velocity: 80,
    startTick,
    durationTicks: PPQ,
    channel: 1,
  }));
}

/** Convert a rootPc + quality into a ChordRegion for analyzeHarmony. */
function chordToRegion(
  rootPc: number,
  quality: string,
  index: number,
): ChordRegion {
  const intervals: number[] | undefined = CHORDS[quality];
  const base = 60 + rootPc;
  const midis = intervals ? intervals.map((iv: number) => base + iv) : [base];

  return {
    id: `live-${index}`,
    startTick: index * PPQ,
    endTick: (index + 1) * PPQ,
    name: `${NOTE_NAMES[rootPc]}${quality === 'major' ? '' : quality}`,
    noteName: NOTE_NAMES[rootPc],
    color: [128, 128, 128],
    midis,
  };
}

// ── Class ────────────────────────────────────────────────────────────────

export class LiveUnisonAnalyzer {
  private window: LiveChordInput[] = [];
  private lastKey: KeyDetection | null = null;
  private lastEnriched: UnisonChordRegion[] = [];
  private lastMatch: ProgressionMatchResult | null = null;

  /** Push a new chord into the sliding window and re-analyze. */
  pushChord(chord: LiveChordInput): LiveAnalysisResult {
    // Deduplicate: skip if same root+quality as last chord
    const last = this.window[this.window.length - 1];
    if (
      last &&
      last.rootPc === chord.rootPc &&
      last.quality === chord.quality
    ) {
      return this.getResult();
    }

    this.window.push(chord);

    // Trim to window size
    if (this.window.length > WINDOW_SIZE) {
      this.window.splice(0, this.window.length - WINDOW_SIZE);
    }

    // Only analyze when we have enough chords
    if (this.window.length < MIN_CHORDS) {
      return this.getResult();
    }

    this.analyze();
    return this.getResult();
  }

  /** Get current analysis result without pushing a new chord. */
  getResult(): LiveAnalysisResult {
    return {
      key: this.lastKey,
      enrichedChords: this.lastEnriched,
      progressionMatch: this.lastMatch,
      windowSize: this.window.length,
    };
  }

  /** Reset all state. */
  reset(): void {
    this.window = [];
    this.lastKey = null;
    this.lastEnriched = [];
    this.lastMatch = null;
  }

  // ── Internal ──────────────────────────────────────────────────────────

  private analyze(): void {
    // Step 1: Build synthetic MIDI events from chord window for key detection
    const allEvents: MidiNoteEvent[] = [];
    for (let i = 0; i < this.window.length; i++) {
      const c = this.window[i];
      allEvents.push(...chordToEvents(c.rootPc, c.quality, i * PPQ));
    }

    // Step 2: Detect key from the chord window
    this.lastKey = detectKey(allEvents);

    // Step 3: Build ChordRegions and run harmonic analysis (roman numerals)
    if (this.lastKey) {
      const regions: ChordRegion[] = this.window.map((c, i) =>
        chordToRegion(c.rootPc, c.quality, i),
      );
      this.lastEnriched = analyzeHarmony(regions, this.lastKey, allEvents);
    } else {
      this.lastEnriched = [];
    }

    // Step 4: Match against progression library
    if (this.lastEnriched.length >= MIN_CHORDS) {
      const matches = matchProgressions(this.lastEnriched);
      this.lastMatch = matches.length > 0 ? matches[0] : null;
    } else {
      this.lastMatch = null;
    }
  }
}
