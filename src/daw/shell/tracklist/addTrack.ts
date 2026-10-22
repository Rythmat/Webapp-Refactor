import { create } from 'zustand';
import { useStore } from '@/daw/store';
import type { ChannelStripTabId } from '@/daw/store/uiSlice';
import type { TrackChoice } from './trackTemplates';

// ── Adding a track (milestones 2.6 and 2.14) ───────────────────────────────
//
// The Add-track menu's open state, and the one way the menu adds a track:
// add it with the sound it is for, select it, and open the dock on the tab
// that plays it (the drum grid's Notes, the instrument, an audio track's
// input). A running lesson opens
// what its steps need itself, so during one the dock is left as it is.

interface AddTrackMenuState {
  open: boolean;
  setOpen(open: boolean): void;
}

export const useAddTrackMenu = create<AddTrackMenuState>()((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
}));

/**
 * Opens + Add track's menu under the track list (the palette's Add a
 * track…): it scrolls into view first, so the menu opens where the student
 * can see it.
 */
export const openAddTrackMenu = () => {
  document
    .querySelector('[data-testid="add-track-button"]')
    ?.scrollIntoView?.({ block: 'nearest' });
  useAddTrackMenu.getState().setOpen(true);
};

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
