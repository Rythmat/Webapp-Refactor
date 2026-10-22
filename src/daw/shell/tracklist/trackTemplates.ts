import type { InstrumentType, TrackType } from '@/daw/store';
import type { TrackInit } from '@/daw/store/tracksSlice';
import type { ChannelStripTabId } from '@/daw/store/uiSlice';

// ── What + Add track offers (milestones 2.6 and 2.14; Suno layout) ────────
//
// What the Add-track menu adds. The menu has three rows (AddTrackMenu):
// Add Audio (the plain audio track below), Add MIDI (a submenu of the MIDI
// instruments, MIDI_MENU) and Upload. Every choice says in one line what
// it is for (the About line).
//
// Lesson anchors (`add-track-<anchor>`, AddTrackMenu) stay the ones the
// lessons already name: a choice's anchor is its old card's instrument (the
// Synth keeps 'synth'). The old picker's category tiles ('cat-keys',
// 'cat-drums', 'cat-amp') went with it; ANCHOR_ALIASES points them at the
// menu's rows.

export type TrackChoiceId =
  | 'audio'
  | 'drum-grid'
  | 'synth'
  | 'instruments'
  | 'sampler';

export interface TrackChoice {
  id: TrackChoiceId;
  /** The lesson anchor after 'add-track-' (string literal in the array, read by tutorialAnchors.test). */
  anchor: string;
  /** The tile's title. */
  label: string;
  /** One line: what it is for. */
  about: string;
  /** The new track's name. */
  trackName: string;
  trackType: TrackType;
  instrument: InstrumentType;
  /** The sound and role the track starts with (addTrack). */
  init?: TrackInit;
  /** The dock tab an add opens (not during a lesson). */
  dockTab: ChannelStripTabId;
}

export const TRACK_CHOICES: readonly TrackChoice[] = [
  {
    id: 'audio',
    anchor: 'audio',
    label: 'Audio',
    about: 'Record a mic, guitar or any sound from an input',
    trackName: 'Audio Track',
    trackType: 'audio',
    instrument: 'audio-input',
    // An Audio track's one dock: its Tuner, amp, pitch correction, effects.
    dockTab: 'controls',
  },
  {
    id: 'drum-grid',
    anchor: 'drum-machine',
    label: 'Drums',
    about: 'Program your own beat, one step at a time',
    trackName: 'Drums',
    trackType: 'midi',
    instrument: 'drum-machine',
    // The drums' Notes tab is the step sequencer (milestone 2.9).
    dockTab: 'piano-roll',
  },
  {
    id: 'synth',
    anchor: 'synth',
    label: 'Synth',
    about: 'Oracle Synth: leads, basses and pads you can shape',
    trackName: 'Synth',
    trackType: 'midi',
    instrument: 'oracle-synth',
    dockTab: 'controls',
  },
  {
    id: 'instruments',
    anchor: 'soundfont',
    label: 'Instruments',
    about: 'Strings, brass, guitars and more',
    trackName: 'Instruments',
    trackType: 'midi',
    instrument: 'soundfont',
    dockTab: 'controls',
  },
];

/**
 * Add MIDI's submenu, in the owner's order (2026-10-21). Drums opens on the
 * step sequencer; its Grooves tab is a click away.
 */
export const MIDI_MENU: readonly TrackChoiceId[] = [
  'instruments',
  'synth',
  'drum-grid',
];

export function choiceOf(id: TrackChoiceId): TrackChoice {
  const choice = TRACK_CHOICES.find((c) => c.id === id);
  if (!choice) throw new Error(`No track choice "${id}"`);
  return choice;
}
