import { create } from 'zustand';

// ── Which track the Instrument dialog is changing ──────────────────────────
//
// One dialog (InstrumentDialog), opened from a track's ⋯ menu (Instrument…)
// and the dock's instrument button. Session-only, outside the project store:
// nothing here is saved.

interface InstrumentDialogState {
  /** The track whose instrument is being chosen, or null while closed. */
  trackId: string | null;
  open(trackId: string): void;
  close(): void;
}

export const useInstrumentDialogStore = create<InstrumentDialogState>()(
  (set) => ({
    trackId: null,
    open: (trackId) => set({ trackId }),
    close: () => set({ trackId: null }),
  }),
);

/** Opens the Instrument dialog on track `trackId`. */
export const openInstrumentDialog = (trackId: string) =>
  useInstrumentDialogStore.getState().open(trackId);
