import type { InstrumentType, TrackType } from '@/daw/store';
import type { TrackInit } from '@/daw/store/tracksSlice';
import type { ChannelStripTabId } from '@/daw/store/uiSlice';

// ── What the Add-track picker offers (milestones 2.6 and 2.14) ─────────────
//
// One list for the picker and the empty project's tiles. The picker shows
// eight categories first, in the order a student most often reaches for
// them; a category with more than one engine (Keys, Drums, the amp) opens a
// second step with its choices, and the others add their one choice at
// once. Every category and choice says in one line what it is for (the
// About line).
//
// Lesson anchors (`add-track-<anchor>`, AddTrackSheet) stay the ones the
// lessons already name: a choice's anchor is its old card's instrument (the
// Synth keeps 'synth'), and only a category with a second step has an anchor
// of its own ('cat-keys', 'cat-drums', 'cat-amp'). A one-choice category's
// tile carries its choice's anchor.

export type TrackChoiceId =
  | 'piano'
  | 'electric-piano'
  | 'organ'
  | 'drum-grid'
  | 'grooves'
  | 'bass'
  | 'synth'
  | 'instruments'
  | 'sampler'
  | 'voice'
  | 'guitar'
  | 'bass-amp';

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
    id: 'piano',
    anchor: 'piano-sampler',
    label: 'Piano',
    about: 'A grand piano, for chords and melodies',
    trackName: 'Piano',
    trackType: 'midi',
    instrument: 'piano-sampler',
    dockTab: 'controls',
  },
  {
    id: 'electric-piano',
    anchor: 'electric-piano',
    label: 'Electric piano',
    about: 'A soft electric piano, for R&B, soul and lo-fi',
    trackName: 'Electric piano',
    trackType: 'midi',
    instrument: 'electric-piano',
    dockTab: 'controls',
  },
  {
    id: 'organ',
    anchor: 'tonewheel-organ',
    label: 'Organ',
    about: 'A tonewheel organ with drawbars, like a Hammond B3',
    trackName: 'Organ',
    trackType: 'midi',
    instrument: 'tonewheel-organ',
    dockTab: 'controls',
  },
  {
    id: 'drum-grid',
    anchor: 'drum-machine',
    label: 'Drum grid',
    about: 'Program your own beat, one step at a time',
    trackName: 'Drums',
    trackType: 'midi',
    instrument: 'drum-machine',
    // The drums' Notes tab is the step sequencer (milestone 2.9).
    dockTab: 'piano-roll',
  },
  {
    id: 'grooves',
    anchor: 'grooves',
    label: 'Grooves',
    about: 'Start from a hip hop, funk or rock groove, then make it yours',
    trackName: 'Drums',
    trackType: 'midi',
    instrument: 'drum-machine',
    dockTab: 'grooves',
  },
  {
    id: 'bass',
    anchor: 'bass-electric',
    label: 'Bass',
    about: 'A bass guitar to play and write bass lines',
    trackName: 'Bass',
    trackType: 'midi',
    instrument: 'bass-electric',
    init: { bassVoice: 'finger', trackRole: 'bass' },
    dockTab: 'controls',
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
  {
    id: 'sampler',
    anchor: 'sampler',
    label: 'Sampler',
    about: 'Chop a sample and play it from the keys',
    trackName: 'Sampler',
    trackType: 'midi',
    instrument: 'sampler',
    dockTab: 'controls',
  },
  {
    id: 'voice',
    anchor: 'vocal-fx',
    label: 'Voice',
    about: 'Record singing, rapping or any sound with a mic',
    trackName: 'Voice',
    trackType: 'audio',
    instrument: 'vocal-fx',
    dockTab: 'controls',
  },
  {
    id: 'guitar',
    anchor: 'guitar-fx',
    label: 'Guitar',
    about: 'Your guitar through an amp and pedals',
    trackName: 'Guitar',
    trackType: 'audio',
    instrument: 'guitar-fx',
    dockTab: 'controls',
  },
  {
    id: 'bass-amp',
    anchor: 'bass-fx',
    label: 'Bass',
    about: 'Your bass through an amp',
    trackName: 'Bass',
    trackType: 'audio',
    instrument: 'bass-fx',
    dockTab: 'controls',
  },
];

export type TrackCategoryId =
  | 'keys'
  | 'drums'
  | 'bass'
  | 'synth'
  | 'instruments'
  | 'sampler'
  | 'voice'
  | 'amp';

export interface TrackCategory {
  id: TrackCategoryId;
  /** Only categories with a second step have their own anchor ('cat-keys' …); a one-choice tile renders its choice's anchor. */
  anchor?: string;
  label: string;
  /** One line: what it is for. */
  about: string;
  /** What it offers, in order: one adds at once, more open a second step. */
  choices: readonly TrackChoiceId[];
}

export const TRACK_CATEGORIES: readonly TrackCategory[] = [
  {
    id: 'keys',
    anchor: 'cat-keys',
    label: 'Keys',
    about: 'Piano, electric piano and organ, to play and write on',
    choices: ['piano', 'electric-piano', 'organ'],
  },
  {
    id: 'drums',
    anchor: 'cat-drums',
    label: 'Drums',
    about: 'Program your own beat, or start from a groove',
    choices: ['drum-grid', 'grooves'],
  },
  {
    id: 'bass',
    label: 'Bass',
    about: 'A bass guitar to play and write bass lines',
    choices: ['bass'],
  },
  {
    id: 'synth',
    label: 'Synth',
    about: 'Oracle Synth: leads, basses and pads you can shape',
    choices: ['synth'],
  },
  {
    id: 'instruments',
    label: 'Instruments',
    about: 'Strings, brass, guitars and more',
    choices: ['instruments'],
  },
  {
    id: 'sampler',
    label: 'Sampler',
    about: 'Chop a sample and play it from the keys',
    choices: ['sampler'],
  },
  {
    id: 'voice',
    label: 'Voice',
    about: 'Record singing, rapping or any sound with a mic',
    choices: ['voice'],
  },
  {
    id: 'amp',
    anchor: 'cat-amp',
    label: 'Guitar & bass amp',
    about: 'Plug in a guitar or bass and record it through an amp',
    choices: ['guitar', 'bass-amp'],
  },
];

export function choiceOf(id: TrackChoiceId): TrackChoice {
  const choice = TRACK_CHOICES.find((c) => c.id === id);
  if (!choice) throw new Error(`No track choice "${id}"`);
  return choice;
}

export function categoryOf(id: TrackCategoryId): TrackCategory {
  const category = TRACK_CATEGORIES.find((c) => c.id === id);
  if (!category) throw new Error(`No track category "${id}"`);
  return category;
}
