import { useStore } from '@/daw/store';
import { dockKindOf, editorTabFor } from './dockTabs';

// ── A click on a clip opens its editor in the dock (milestone 2.9) ─────────
//
// Selection drives the dock, as in Soundtrap (ST3): a click on a clip
// selects the clip and its track, and shows that clip's editor in the dock,
// opening the dock if it is shut: Notes for a MIDI clip (the drum grid on
// drums), the chain for audio. Until 2.9 a Pointer click selected only the
// clip, so the dock's Instrument and Effects followed one track and its
// note editor another, and only a double-click opened the clip, in a modal
// piano roll over the editor.
//
// A collaborator holding the track keeps it: setSelectedTrackId refuses,
// and the dock stays as it is. During a lesson the clip and its track are
// selected but the dock keeps its tab, which the step chose (as a new
// track's does).

export function openClipEditor(trackId: string): void {
  const s = useStore.getState();
  if (s.selectedTrackId !== trackId) s.setSelectedTrackId(trackId);
  const after = useStore.getState();
  if (after.selectedTrackId !== trackId) return;
  if (after.activeTutorialId !== null) return;
  const track = after.tracks.find((t) => t.id === trackId);
  if (!track) return;
  if (after.dockMaster) after.setDockMaster(false);
  after.setChannelStripTab(editorTabFor(dockKindOf(track)));
}

/**
 * The track row's instrument button (2.15): selects the track and opens the
 * dock on what plays it (Instrument; the chain for an audio track), with
 * focus in the dock, as Enter on the row does. Unlike a clip's click it
 * works during a lesson too: it is the student's own choice. False when a
 * collaborator holds the track.
 */
export function openTrackInDock(trackId: string): boolean {
  const s = useStore.getState();
  if (s.selectedTrackId !== trackId) s.setSelectedTrackId(trackId);
  const after = useStore.getState();
  if (after.selectedTrackId !== trackId) return false;
  const track = after.tracks.find((t) => t.id === trackId);
  if (!track) return false;
  if (after.dockMaster) after.setDockMaster(false);
  after.setChannelStripTab(dockKindOf(track) === 'audio' ? 'fx' : 'controls');
  requestAnimationFrame(() =>
    document.querySelector<HTMLElement>('[data-dock-content]')?.focus(),
  );
  return true;
}
