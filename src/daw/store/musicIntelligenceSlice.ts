// ── MusicIntelligenceBus ──────────────────────────────────────────────────
// Central hub for shared music context across all four audio systems:
//   UNISON, Chord Detector, Tuner, and Auto-Tune.
//
// Data flows:
//   UNISON (offline) ──key/mode──→ Bus ──bitmask──→ Auto-Tune activeNotes
//                                   │    └──key──→ Chord Detector diatonic priors
//   Chord Detector ──live chords──→ liveChordStream ──→ Live UNISON analysis
//                   ──tuning──────→ globalTuningCents ──→ Tuner display

import type { StateCreator } from 'zustand';
import type { AllSlices } from './index';
import type { LiveAnalysisResult } from '@/unison/engine/liveAnalyzer';
import { ALL_MODES } from '@prism/engine';

// ── Types ────────────────────────────────────────────────────────────────

export type KeySource = 'manual' | 'unison-offline' | 'unison-live';

export interface LiveChordEntry {
  rootPc: number;
  quality: string;
  confidence: number;
  timestamp: number; // performance.now()
}

export interface MusicIntelligenceSlice {
  // Consensus key/mode (from UNISON, manual setting, or real-time inference)
  detectedKeyRootPc: number | null;
  detectedMode: string | null;
  keyConfidence: number;
  keySource: KeySource | null;

  // Derived: 12-bit active notes bitmask for the current key
  activeNotesBitmask: number;

  // Shared tuning offset (cents from A440)
  globalTuningCents: number;

  // Live chord stream (rolling buffer for live UNISON analysis)
  liveChordStream: LiveChordEntry[];

  // Live UNISON analysis result (populated by useLiveUnisonAnalysis hook)
  liveAnalysis: LiveAnalysisResult | null;

  // Actions
  setDetectedKey: (
    rootPc: number,
    mode: string,
    confidence: number,
    source: KeySource,
  ) => void;
  clearDetectedKey: () => void;
  pushLiveChord: (chord: Omit<LiveChordEntry, 'timestamp'>) => void;
  setGlobalTuningCents: (cents: number) => void;
  setLiveAnalysis: (result: LiveAnalysisResult | null) => void;
}

// ── Helpers ──────────────────────────────────────────────────────────────

/** Maximum entries in the live chord stream (~30 seconds at ~1 chord/sec). */
const MAX_LIVE_CHORDS = 30;

/**
 * Compute a 12-bit bitmask of active notes from a root pitch class and mode.
 * Bit 0 = C, Bit 1 = C#, ..., Bit 11 = B.
 */
function computeActiveNotesBitmask(rootPc: number, mode: string): number {
  const intervals = ALL_MODES[mode];
  if (!intervals) return 0xfff; // chromatic fallback (all notes active)

  let bitmask = 0;
  for (const interval of intervals) {
    const pc = (rootPc + interval) % 12;
    bitmask |= 1 << pc;
  }
  return bitmask;
}

// ── Slice ────────────────────────────────────────────────────────────────

export const createMusicIntelligenceSlice: StateCreator<
  AllSlices,
  [['zustand/subscribeWithSelector', never]],
  [],
  MusicIntelligenceSlice
> = (set) => ({
  detectedKeyRootPc: null,
  detectedMode: null,
  keyConfidence: 0,
  keySource: null,
  activeNotesBitmask: 0xfff, // default: all notes (chromatic)
  globalTuningCents: 0,
  liveChordStream: [],
  liveAnalysis: null,

  setDetectedKey: (rootPc, mode, confidence, source) => {
    const bitmask = computeActiveNotesBitmask(rootPc, mode);
    set({
      detectedKeyRootPc: rootPc,
      detectedMode: mode,
      keyConfidence: confidence,
      keySource: source,
      activeNotesBitmask: bitmask,
    });
  },

  clearDetectedKey: () => {
    set({
      detectedKeyRootPc: null,
      detectedMode: null,
      keyConfidence: 0,
      keySource: null,
      activeNotesBitmask: 0xfff,
    });
  },

  pushLiveChord: (chord) => {
    set((state) => {
      const entry: LiveChordEntry = {
        ...chord,
        timestamp: performance.now(),
      };
      const stream = [...state.liveChordStream, entry];
      // Trim to rolling window
      if (stream.length > MAX_LIVE_CHORDS) {
        stream.splice(0, stream.length - MAX_LIVE_CHORDS);
      }
      return { liveChordStream: stream };
    });
  },

  setGlobalTuningCents: (cents) => {
    set({ globalTuningCents: cents });
  },

  setLiveAnalysis: (result) => {
    set({ liveAnalysis: result });
  },
});
