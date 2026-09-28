import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ── Guitar display settings ────────────────────────────────────────────────
// Per-device choices for what the guitar diagrams label and which optional
// theory layers show. Defaults follow the book: finger numbers on the
// diagrams, extra chips and badges off until asked for (one idea at a time).

/** What a chord box's dots say. */
export type ChordBoxLabelMode = 'fingers' | 'chordTones';
/** What the fretboard / scale box dots say on scale and melody steps. */
export type ScaleLabelMode = 'fingers' | 'notes' | 'keyNumbers';
/** What the fretboard dots say on chord and arpeggio steps. */
export type ChordFretboardLabelMode = 'fingers' | 'notes' | 'chordTones';

interface GuitarDisplaySettings {
  chordBoxLabels: ChordBoxLabelMode;
  scaleLabels: ScaleLabelMode;
  chordFretboardLabels: ChordFretboardLabelMode;
  /** W / H step chips on scale steps. */
  showSteps: boolean;
  /** Home / Away / Tension badges over Music Map bars. */
  showChordJobs: boolean;
  /** Roman numerals beside chord names (a teacher/classroom setting). */
  showRomanNumerals: boolean;
  /** Shared-note badges between chords that change. */
  showSharedNotes: boolean;
  /** Theory notes the student closed; an intro note auto-opens only once. */
  dismissedNotes: string[];
  setChordBoxLabels: (mode: ChordBoxLabelMode) => void;
  setScaleLabels: (mode: ScaleLabelMode) => void;
  setChordFretboardLabels: (mode: ChordFretboardLabelMode) => void;
  setShowSteps: (show: boolean) => void;
  setShowChordJobs: (show: boolean) => void;
  setShowRomanNumerals: (show: boolean) => void;
  setShowSharedNotes: (show: boolean) => void;
  dismissNote: (id: string) => void;
  isDismissed: (id: string) => boolean;
}

export const useGuitarDisplaySettings = create<GuitarDisplaySettings>()(
  persist(
    (set, get) => ({
      chordBoxLabels: 'fingers',
      scaleLabels: 'fingers',
      chordFretboardLabels: 'fingers',
      showSteps: false,
      showChordJobs: false,
      showRomanNumerals: false,
      showSharedNotes: true,
      dismissedNotes: [],
      setChordBoxLabels: (chordBoxLabels) => set({ chordBoxLabels }),
      setScaleLabels: (scaleLabels) => set({ scaleLabels }),
      setChordFretboardLabels: (chordFretboardLabels) =>
        set({ chordFretboardLabels }),
      setShowSteps: (showSteps) => set({ showSteps }),
      setShowChordJobs: (showChordJobs) => set({ showChordJobs }),
      setShowRomanNumerals: (showRomanNumerals) => set({ showRomanNumerals }),
      setShowSharedNotes: (showSharedNotes) => set({ showSharedNotes }),
      dismissNote: (id) =>
        set((state) =>
          state.dismissedNotes.includes(id)
            ? state
            : { dismissedNotes: [...state.dismissedNotes, id] },
        ),
      isDismissed: (id) => get().dismissedNotes.includes(id),
    }),
    { name: 'music-atlas-guitar-display', version: 1 },
  ),
);
