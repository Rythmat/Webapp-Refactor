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

// ── UNISON Slice ──────────────────────────────────────────────────────────
// Stores the UNISON analysis document and manages the analysis lifecycle.

export interface UnisonSlice {
  unisonDoc: UnisonDocument | null;
  unisonLoading: boolean;
  unisonError: string | null;

  analyzeSession: () => void;
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

      // Phase 8: If UNISON identified a melody track, refine chord regions
      // by excluding that track's notes from harmony detection.
      if (doc.melody) {
        get().refineWithMelody(doc.melody.trackId, doc.melody.pitchRange);
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
