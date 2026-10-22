import { useStore } from '@/daw/store';
import { dockKindOf, type DockKind } from './dockTabs';

// ── Opening and shutting the dock ──────────────────────────────────────────
//
// The dock is open while it shows a tab, Master or an automation lane. These
// are the one way to open or shut it from its frame: the close button, the
// resizer's double-click and Enter, and a double-click on the shut dock's
// title row (owner, 2026-10-22: double-clicking the dock opens and shuts
// it).

/** The tab that opens a shut dock for a track of `kind`. */
export const openingTab = (kind: DockKind) =>
  kind === 'audio' ? ('fx' as const) : ('controls' as const);

/** Whether the dock shows anything: a tab, Master or an automation lane. */
export function dockIsOpen(): boolean {
  const s = useStore.getState();
  return (
    s.channelStripTab !== null ||
    s.dockMaster ||
    s.automationOpenTrackId !== null
  );
}

/** Shuts the dock: no tab (which takes Master and Maximize too), no lane. */
export function closeDock(): void {
  const s = useStore.getState();
  s.setChannelStripTab(null);
  s.setAutomationOpenTrackId(null);
}

/** Opens the dock on the selected track, on what plays it. */
export function openDock(): void {
  const s = useStore.getState();
  const track = s.tracks.find((t) => t.id === s.selectedTrackId);
  s.setChannelStripTab(openingTab(dockKindOf(track)));
}

/** Opens a shut dock, shuts an open one. */
export function toggleDock(): void {
  if (dockIsOpen()) closeDock();
  else openDock();
}
