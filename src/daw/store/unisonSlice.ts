import type { StateCreator } from 'zustand';
import type { AllSlices } from './index';
import type { UnisonDocument } from '@/unison/types/schema';
import {
  sessionToUnison,
  type SessionSnapshot,
} from '@/unison/converters/sessionToUnison';
import {
  audioToUnison,
  type AudioToUnisonOptions,
} from '@/unison/converters/audioToUnison';
import {
  chordSelectionKey,
  chordSelectionSnapshot,
  noteSelectionKey,
  noteSelectionSnapshot,
  type ClipNoteSelection,
} from '@/daw/utils/insightSelection';
import {
  analyzeChordSymbols,
  hasHarmonyNotes,
  type ChordAnalysis,
} from '@/daw/utils/chordAnalysis';

/** The store update for analyzing a selection: its document, or the error. */
function selectionAnalysisUpdate(
  key: string,
  buildSnapshot: () => SessionSnapshot,
): Pick<UnisonSlice, 'selectionAnalysis'> & Partial<UnisonSlice> {
  try {
    return {
      selectionAnalysis: { key, doc: sessionToUnison(buildSnapshot()) },
    };
  } catch (err) {
    return {
      selectionAnalysis: null,
      unisonError: err instanceof Error ? err.message : 'Analysis failed',
    };
  }
}

// ── UNISON Slice ──────────────────────────────────────────────────────────
// Stores the UNISON analysis document and manages the analysis lifecycle.

export interface UnisonSlice {
  unisonDoc: UnisonDocument | null;
  unisonLoading: boolean;
  unisonError: string | null;
  // Insight's analysis of a chord or note selection, and the selection key
  // (insightSelection) it was made for — stale once that key changes.
  selectionAnalysis: { key: string; doc: UnisonDocument } | null;

  analyzeSession: () => void;
  analyzeChordSelection: (chordIds: string[]) => void;
  analyzeNoteSelection: (selection: ClipNoteSelection[]) => void;
  clearSelectionAnalysis: () => void;
  // Chord symbols proposed by analyzing the music (chordAnalysis). The chord
  // lane only takes them through applyChordSymbols — the user's "Use Chord
  // Symbols" — so it always holds chords the user accepted.
  chordAnalysis: ChordAnalysis | null;
  // A just-opened project has notes but no chord symbols: ask whether to
  // analyze them (ChordAnalysisPrompt).
  chordAnalysisPromptOpen: boolean;
  /** Analyze these tracks (null: every track, by role) and keep the proposal. */
  analyzeChords: (trackIds?: string[] | null) => ChordAnalysis;
  proposeChordSymbols: (analysis: ChordAnalysis) => void;
  /** Put the proposed chord symbols in the chord lane. */
  applyChordSymbols: () => void;
  /** Open the prompt when the project has chord notes but no chord symbols. */
  offerChordAnalysis: () => void;
  closeChordAnalysisPrompt: () => void;
  analyzeAudio: (
    audioBuffer: AudioBuffer,
    options?: AudioToUnisonOptions,
  ) => void;
  clearUnisonAnalysis: () => void;
  applyKeyToSession: () => void;
  exportUnisonJSON: () => void;
}

export const createUnisonSlice: StateCreator<
  AllSlices,
  [['zustand/subscribeWithSelector', never]],
  [],
  UnisonSlice
> = (set, get) => ({
  unisonDoc: null,
  unisonLoading: false,
  unisonError: null,
  selectionAnalysis: null,

  // The same theory engine as analyzeSession, run on just the selected chords
  // (with the notes sounding during them) or just the selected notes.
  analyzeChordSelection: (chordIds) =>
    set(
      chordIds.length === 0
        ? { selectionAnalysis: null }
        : selectionAnalysisUpdate(chordSelectionKey(chordIds), () =>
            chordSelectionSnapshot(get(), chordIds),
          ),
    ),

  analyzeNoteSelection: (selection) =>
    set(
      selection.length === 0
        ? { selectionAnalysis: null }
        : selectionAnalysisUpdate(
            noteSelectionKey(get().tracks, selection),
            () => noteSelectionSnapshot(get(), selection),
          ),
    ),

  clearSelectionAnalysis: () => set({ selectionAnalysis: null }),

  chordAnalysis: null,
  chordAnalysisPromptOpen: false,

  analyzeChords: (trackIds = null) => {
    const { tracks, rootNote, mode, unisonDoc } = get();
    const analysis = analyzeChordSymbols(tracks, {
      rootNote,
      mode,
      trackIds,
      melody: unisonDoc?.melody,
    });
    set({ chordAnalysis: analysis });
    return analysis;
  },

  proposeChordSymbols: (analysis) => set({ chordAnalysis: analysis }),

  applyChordSymbols: () => {
    const { chordAnalysis, rootNote, setRootNote, setMode, setChordRegions } =
      get();
    if (!chordAnalysis || chordAnalysis.regions.length === 0) return;
    // Chords read in a detected key: adopt it, so they're named in that key.
    if (rootNote === null && chordAnalysis.keyDetected) {
      setRootNote(chordAnalysis.rootNote);
      setMode(chordAnalysis.mode);
    }
    setChordRegions(chordAnalysis.regions, true);
  },

  offerChordAnalysis: () => {
    const { chordRegions, tracks } = get();
    if (chordRegions.length === 0 && hasHarmonyNotes(tracks)) {
      set({ chordAnalysisPromptOpen: true });
    }
  },

  closeChordAnalysisPrompt: () => set({ chordAnalysisPromptOpen: false }),

  analyzeSession: () => {
    set({ unisonLoading: true, unisonError: null });

    try {
      const state = get();

      // Pre-validation: check for MIDI content
      const midiTracks = state.tracks.filter((t) => t.type === 'midi');
      if (midiTracks.length === 0) {
        set({
          unisonLoading: false,
          unisonError:
            'No MIDI tracks found. Import MIDI or record some notes first.',
        });
        return;
      }

      const hasEvents = midiTracks.some((t) =>
        t.midiClips.some((c) => c.events.length > 0),
      );
      if (!hasEvents) {
        set({
          unisonLoading: false,
          unisonError:
            'No MIDI events found. Record or import notes to analyze.',
        });
        return;
      }

      // Build snapshot from current store state
      const snapshot: SessionSnapshot = {
        tracks: state.tracks.map((t) => ({
          id: t.id,
          name: t.name,
          type: t.type,
          instrument: t.instrument,
          midiClips: t.midiClips.map((c) => ({
            events: c.events,
            ccEvents: c.ccEvents,
          })),
        })),
        chordRegions: state.chordRegions,
        bpm: state.bpm,
        timeSignatureNumerator: state.timeSignatureNumerator,
        timeSignatureDenominator: state.timeSignatureDenominator,
        rootNote: state.rootNote,
        mode: state.mode,
      };

      const doc = sessionToUnison(snapshot);

      set({
        unisonDoc: doc,
        unisonLoading: false,
      });

      // Push detected key to the MusicIntelligenceBus so chord detection
      // and auto-tune automatically receive diatonic priors / scale bitmask
      const { key } = doc.analysis;
      if (key.confidence > 0.5) {
        get().setDetectedKey(
          key.rootPc,
          key.mode,
          key.confidence,
          'unison-offline',
        );
      }
    } catch (err) {
      set({
        unisonLoading: false,
        unisonError: err instanceof Error ? err.message : 'Analysis failed',
      });
    }
  },

  analyzeAudio: (audioBuffer: AudioBuffer, options?: AudioToUnisonOptions) => {
    set({ unisonLoading: true, unisonError: null });

    try {
      const state = get();
      const doc = audioToUnison(audioBuffer, {
        bpm: options?.bpm ?? state.bpm,
        title: options?.title,
        filename: options?.filename,
        keyRootPc: options?.keyRootPc ?? state.rootNote ?? undefined,
        modeIntervals: options?.modeIntervals,
      });

      set({ unisonDoc: doc, unisonLoading: false });

      // Push detected key to the MusicIntelligenceBus
      const { key } = doc.analysis;
      if (key.confidence > 0.5) {
        get().setDetectedKey(
          key.rootPc,
          key.mode,
          key.confidence,
          'unison-offline',
        );
      }
    } catch (err) {
      set({
        unisonLoading: false,
        unisonError:
          err instanceof Error ? err.message : 'Audio analysis failed',
      });
    }
  },

  clearUnisonAnalysis: () => {
    set({
      unisonDoc: null,
      unisonError: null,
    });
  },

  applyKeyToSession: () => {
    const { unisonDoc } = get();
    if (!unisonDoc) return;

    const { rootPc, mode } = unisonDoc.analysis.key;

    // Apply detected key to the prism slice (triggers chord re-derivation)
    get().setRootNote(rootPc);
    get().setMode(mode);

    // Re-analyze with the new key context
    get().analyzeSession();
  },

  exportUnisonJSON: () => {
    const { unisonDoc } = get();
    if (!unisonDoc) {
      set({
        unisonError: 'No analysis to export. Run Analyze first.',
      });
      return;
    }

    const json = JSON.stringify(unisonDoc, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${unisonDoc.metadata.title}.unison.json`;
    a.click();
    URL.revokeObjectURL(url);
  },
});
