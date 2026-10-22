import type { ChannelStripTabId } from '@/daw/store/uiSlice';
import type { DockKind } from './dockTabs';

// ── The dock's views on the bottom rail (the floating frame, 2026-10-21) ────
//
// The bottom rail's left pills open what sits under the timeline, as the
// floating frame's do (owner: "an icon for Instrument, FX, Automation,
// Edit"). They replace the dock's tab bar (Instrument · Grooves or Prism ·
// Notes · Effects):
//
//   Instrument   the dock's Instrument tab ('controls')
//   FX           its Effects tab ('fx')
//   Automation   the automation lane under the tracks, for the selected
//                track (automationOpenTrackId): it stacks with the dock
//   Edit         its Notes tab ('piano-roll'): the piano roll, or the drum
//                grid on drums
//
// Prism and Grooves have no button until the owner places them; they stay
// dock tabs a lesson or a draft can open (dockTabs.ts). A view that doesn't
// fit the track is off: an audio track's dock is its chain (FX), a
// live-input track's is its input (Instrument; its Effects return with the
// effects redesign), and only a MIDI track has notes to edit.

export type DockViewId = 'instrument' | 'fx' | 'automation' | 'edit';

export interface DockView {
  id: DockViewId;
  label: string;
  /** The dock tab the view opens; Automation opens a lane, not a tab. */
  tab?: ChannelStripTabId;
}

/** The views in the rail's order: two pills, Instrument · FX and Automation · Edit. */
export const DOCK_VIEWS: readonly DockView[] = [
  { id: 'instrument', label: 'Instrument', tab: 'controls' },
  { id: 'fx', label: 'FX', tab: 'fx' },
  { id: 'automation', label: 'Automation' },
  { id: 'edit', label: 'Edit', tab: 'piano-roll' },
];

/** Whether a view applies to a track of `kind` (no track: none do). */
export function dockViewApplies(view: DockViewId, kind: DockKind): boolean {
  switch (view) {
    case 'instrument':
      return kind === 'drums' || kind === 'melodic' || kind === 'live-input';
    case 'fx':
      return kind === 'drums' || kind === 'melodic' || kind === 'audio';
    case 'automation':
      return kind !== 'none';
    case 'edit':
      return kind === 'drums' || kind === 'melodic';
  }
}

/**
 * The dock view that shows, for the rail's pressed look: none while the
 * dock is shut or shows Master, or on a tab with no button (Prism, Grooves).
 * An audio or a live-input track shows one body whatever the tab.
 */
export function activeDockView(
  kind: DockKind,
  tab: ChannelStripTabId | null,
  master: boolean,
): Exclude<DockViewId, 'automation'> | null {
  if (master || tab === null || kind === 'none') return null;
  if (kind === 'audio') return 'fx';
  if (kind === 'live-input') return 'instrument';
  switch (tab) {
    case 'controls':
      return 'instrument';
    case 'fx':
      return 'fx';
    case 'piano-roll':
      return 'edit';
    default:
      return null;
  }
}

/** What each view is for, in a student's words, for the hint line (2.11). */
export function dockViewPurpose(view: DockViewId, kind: DockKind): string {
  switch (view) {
    case 'instrument':
      return kind === 'live-input'
        ? 'Set up this track’s input'
        : 'Play and shape this track’s sound';
    case 'fx':
      return 'Add and adjust this track’s effects';
    case 'automation':
      return 'Draw how this track’s volume, pan and effects change';
    case 'edit':
      return kind === 'drums'
        ? 'Draw the beat on the drum grid'
        : 'Draw and edit this track’s notes';
  }
}
