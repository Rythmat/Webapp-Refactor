import type { InstrumentType } from '@/daw/store/tracksSlice';
import type { ChannelStripTabId } from '@/daw/store/uiSlice';

// ── The dock's tabs (milestone 2.9) ────────────────────────────────────────
//
// Which tabs the dock shows depends on the selected track (decision 16,
// after Soundtrap's drawer), always with Effects last:
//
//   Drums        Instrument · Grooves · Notes · Effects
//   Melodic      Instrument · Prism   · Notes · Effects
//   Audio        no tab bar: the track's effect chain
//   Live input   no tab bar: the pedalboard, then the effects after it
//
// The ids are the ones lessons, drafts and the harness know
// (controls/grooves/prism/piano-roll/fx; decision 9); only the labels
// changed (Controls → Instrument, Piano Roll → Notes, FX → Effects). Parts
// left the dock for the Library panel.
//
// Which tab is open (channelStripTab) is view state the draft keeps, so a
// restored value is checked against the real tabs: a hand-edited draft, or
// one a later or earlier build wrote ('parts'), could hold anything. The
// dock and the codec both check here. There is no React in this module, so
// the codec can import it.

export interface DockTab {
  id: ChannelStripTabId;
  label: string;
}

/** Every tab, in the dock's order; a track kind shows some of them. */
export const DOCK_TABS: readonly DockTab[] = [
  { id: 'controls', label: 'Instrument' },
  { id: 'grooves', label: 'Grooves' },
  { id: 'prism', label: 'Prism' },
  { id: 'piano-roll', label: 'Notes' },
  { id: 'fx', label: 'Effects' },
];

/**
 * What each tab is for, in a student's words, for the hint line (2.11). On
 * drums Notes is the drum grid.
 */
export function dockTabPurpose(id: ChannelStripTabId, kind: DockKind): string {
  switch (id) {
    case 'controls':
      return 'Play and shape this track’s sound';
    case 'grooves':
      return 'Pick a ready-made drum beat for this track';
    case 'prism':
      return 'Build a chord progression from the song’s key';
    case 'piano-roll':
      return kind === 'drums'
        ? 'Draw the beat on the drum grid'
        : 'Draw and edit this track’s notes';
    case 'fx':
      return 'Add and adjust this track’s effects';
  }
}

/** One entry per tab: a tab missing here, or one too many, fails to compile. */
const TABS: Record<ChannelStripTabId, true> = {
  controls: true,
  fx: true,
  grooves: true,
  prism: true,
  'piano-roll': true,
};

/** Every dock tab id. */
export const CHANNEL_STRIP_TAB_IDS = Object.freeze(
  Object.keys(TABS),
) as readonly ChannelStripTabId[];

/** Whether `value` is one of the dock's tabs. */
export function isChannelStripTabId(
  value: unknown,
): value is ChannelStripTabId {
  return (
    typeof value === 'string' &&
    Object.prototype.hasOwnProperty.call(TABS, value)
  );
}

/** What the dock shows for a track, by what the track is. */
export type DockKind = 'drums' | 'melodic' | 'audio' | 'live-input' | 'none';

export function dockKindOf(
  track: { type: string; instrument: InstrumentType } | null | undefined,
): DockKind {
  if (!track) return 'none';
  switch (track.instrument) {
    case 'drum-machine':
      return 'drums';
    case 'guitar-fx':
    case 'bass-fx':
    case 'vocal-fx':
      return 'live-input';
    case 'none':
      return 'audio';
    default:
      return track.type === 'midi' ? 'melodic' : 'audio';
  }
}

const KIND_TABS: Readonly<Record<DockKind, readonly ChannelStripTabId[]>> = {
  drums: ['controls', 'grooves', 'piano-roll', 'fx'],
  melodic: ['controls', 'prism', 'piano-roll', 'fx'],
  // No tab bar: the body is the chain, whatever the tab.
  audio: [],
  'live-input': [],
  none: [],
};

/** The tabs a track of `kind` shows, in order (none: no tab bar). */
export function tabsFor(kind: DockKind): readonly DockTab[] {
  const ids = KIND_TABS[kind];
  return DOCK_TABS.filter((tab) => ids.includes(tab.id));
}

/**
 * The tab to show when the selection moves to a track of `kind` with `tab`
 * open: the same tab when it applies, else the one in its place (Prism and
 * Grooves are each other's), else Instrument. A track with no tab bar keeps
 * the tab as it is, so going back to the last kind finds it again.
 */
export function tabFor(
  kind: DockKind,
  tab: ChannelStripTabId,
): ChannelStripTabId {
  const ids = KIND_TABS[kind];
  if (ids.length === 0 || ids.includes(tab)) return tab;
  if (tab === 'prism' && ids.includes('grooves')) return 'grooves';
  if (tab === 'grooves' && ids.includes('prism')) return 'prism';
  return 'controls';
}

/**
 * The tab that edits a clip of a track of `kind`: Notes for a MIDI clip
 * (the piano roll, or the drum grid on drums), the chain for audio.
 */
export function editorTabFor(kind: DockKind): ChannelStripTabId {
  switch (kind) {
    case 'drums':
    case 'melodic':
      return 'piano-roll';
    case 'live-input':
      // The pedalboard is a live-input track's chain.
      return 'controls';
    default:
      return 'fx';
  }
}
