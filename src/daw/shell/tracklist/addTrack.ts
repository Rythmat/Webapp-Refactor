import { create } from 'zustand';
import { useStore } from '@/daw/store';
import type { ChannelStripTabId } from '@/daw/store/uiSlice';
import type { TrackTemplate } from './trackTemplates';

// ── Adding a track (milestone 2.6) ─────────────────────────────────────────
//
// The Add-track sheet's open state, and the one way the sheet and the empty
// project's tiles add a track: add it, select it, and open the dock on the
// tab that plays it. A running lesson opens what its steps need itself, so
// during one the dock is left as it is.

interface AddTrackSheetState {
  open: boolean;
  setOpen(open: boolean): void;
}

export const useAddTrackSheet = create<AddTrackSheetState>()((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
}));

export const openAddTrackSheet = () =>
  useAddTrackSheet.getState().setOpen(true);

/**
 * Adds a track of `template`'s kind, selects it and opens the dock on
 * `tab` (the instrument by default). Returns its id, or '' when the
 * project's track limit stopped it (addTrack says so).
 */
export function addTrackFrom(
  template: TrackTemplate,
  tab: ChannelStripTabId = 'controls',
): string {
  const state = useStore.getState();
  const id = state.addTrack(
    template.trackType,
    template.instrument,
    template.label,
  );
  if (!id) return '';
  state.setSelectedTrackId(id);
  if (state.activeTutorialId === null) state.setChannelStripTab(tab);
  return id;
}
