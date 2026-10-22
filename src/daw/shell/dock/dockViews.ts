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
//   Automation   the selected track's automation lane, in the dock over
//                the tab (automationOpenTrackId; owner, 2026-10-21), or
//                Master's while the dock shows Master
//   Edit         its Notes tab ('piano-roll'): the piano roll, or the drum
//                grid on drums
//
// Prism and Grooves have no button until the owner places them; they stay
// dock tabs a lesson or a draft can open (dockTabs.ts). A view that doesn't
// fit the track is off: an audio track with no input is its chain (FX), an
// Audio track has one button (its input, amp, pitch correction and effects
// in one dock), and only a MIDI track has notes to edit.

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

/**
 * Whether a view applies while the dock shows Master: its Effects and its
 * automation lane, as a track's (owner, 2026-10-22); Master has no
 * instrument or notes.
 */
export function dockViewAppliesToMaster(view: DockViewId): boolean {
  return view === 'fx' || view === 'automation';
}

/**
 * Whether the rail shows a view's button for a track of `kind`: an Audio
 * track (live input) has one, Instrument, its effects in the same dock;
 * Master and a track with no input (an uploaded file) have FX alone, no
 * Instrument (owner, 2026-10-22). The one button takes the pair's room.
 */
export function dockViewShown(
  view: DockViewId,
  kind: DockKind,
  master = false,
): boolean {
  if (master || kind === 'audio') return view !== 'instrument';
  return !(kind === 'audio-in' && view === 'fx');
}

/**
 * Whether a view's button stands for the Instrument · FX pair, as wide as
 * both: an Audio track's Instrument, Master's and an upload's FX.
 */
export function dockViewFillsPair(
  view: DockViewId,
  kind: DockKind,
  master = false,
): boolean {
  if (master || kind === 'audio') return view === 'fx';
  return kind === 'audio-in' && view === 'instrument';
}

/** The rail button's name for a view on a track of `kind`. */
export function dockViewLabel(view: DockView, kind: DockKind): string {
  return kind === 'audio-in' && view.id === 'instrument'
    ? 'Instrument and effects'
    : view.label;
}

/** Whether a view applies to a track of `kind` (no track: none do). */
export function dockViewApplies(view: DockViewId, kind: DockKind): boolean {
  switch (view) {
    case 'instrument':
      return kind === 'drums' || kind === 'melodic' || kind === 'audio-in';
    case 'fx':
      // A plain Audio track's effects share its Instrument dock.
      return kind !== 'none' && kind !== 'audio-in';
    case 'automation':
      return kind !== 'none';
    case 'edit':
      return kind === 'drums' || kind === 'melodic';
  }
}

/**
 * The dock view that shows, for the rail's pressed look: FX while the dock
 * shows Master (its effects), none while it is shut or on a tab with no
 * button (Prism, Grooves).
 * A track with no input shows its chain whatever the tab, an Audio track
 * its one dock.
 */
export function activeDockView(
  kind: DockKind,
  tab: ChannelStripTabId | null,
  master: boolean,
): Exclude<DockViewId, 'automation'> | null {
  if (master) return 'fx';
  if (tab === null || kind === 'none') return null;
  if (kind === 'audio') return 'fx';
  if (kind === 'audio-in') return 'instrument';
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
export function dockViewPurpose(
  view: DockViewId,
  kind: DockKind,
  master = false,
): string {
  if (master && view === 'fx') return 'Add and adjust the whole mix’s effects';
  if (master && view === 'automation') {
    return 'Draw how the whole mix’s volume changes';
  }
  switch (view) {
    case 'instrument':
      return kind === 'audio-in'
        ? 'Tune up, add an amp or pitch correction, and effects'
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
