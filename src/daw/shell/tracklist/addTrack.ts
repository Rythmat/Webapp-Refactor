import { create } from 'zustand';
import { useStore } from '@/daw/store';
import type { ChannelStripTabId } from '@/daw/store/uiSlice';
import type { TrackChoice } from './trackTemplates';

// ── Adding a track (milestones 2.6 and 2.14) ───────────────────────────────
//
// The Add-track picker's open state, and the one way the picker and the
// empty project's tiles add a track: add it with the sound it is for,
// select it, and open the dock on the tab that plays it (the drum grid's
// Notes, the grooves, the instrument). A running lesson opens what its steps
// need itself, so during one the dock is left as it is.

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
 * Adds the track `choice` makes (its instrument, name and starting sound),
 * selects it and opens the dock on `tab` (the choice's own tab by
 * default). Returns its id, or '' when the project's track limit stopped it
 * (addTrack says so).
 */
export function addTrackFrom(
  choice: TrackChoice,
  tab: ChannelStripTabId = choice.dockTab,
): string {
  const state = useStore.getState();
  const id = state.addTrack(
    choice.trackType,
    choice.instrument,
    choice.trackName,
    choice.init,
  );
  if (!id) return '';
  state.setSelectedTrackId(id);
  if (state.activeTutorialId === null) state.setChannelStripTab(tab);
  return id;
}
