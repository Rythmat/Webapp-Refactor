import type { InstrumentType, TrackType } from '@/daw/store';

// ── What the Add-track sheet offers (milestone 2.6) ────────────────────────
//
// One list for the sheet and the empty project's tiles: each kind of track,
// in the order a student most often reaches for them, with the one-line
// descriptions the old New Track dialog had (in plainer words). Each card's
// lesson anchor is `add-track-<instrument>` (AddTrackSheet); the Synth keeps
// 'add-track-synth', which lesson data names.

export type TrackKind =
  | 'keys'
  | 'synth'
  | 'organ'
  | 'instruments'
  | 'drums'
  | 'sampler'
  | 'voice'
  | 'guitar'
  | 'bass';

export interface TrackTemplate {
  kind: TrackKind;
  label: string;
  description: string;
  trackType: TrackType;
  instrument: InstrumentType;
}

export const TRACK_TEMPLATES: readonly TrackTemplate[] = [
  {
    kind: 'keys',
    label: 'Keys',
    description: 'A piano to play and write on',
    trackType: 'midi',
    instrument: 'piano-sampler',
  },
  {
    kind: 'synth',
    label: 'Synth',
    description: 'Oracle Synth: leads, bass, pads',
    trackType: 'midi',
    instrument: 'oracle-synth',
  },
  {
    kind: 'organ',
    label: 'Organ',
    description: 'A tonewheel organ, like a Hammond B3',
    trackType: 'midi',
    instrument: 'tonewheel-organ',
  },
  {
    kind: 'instruments',
    label: 'Instruments',
    description: 'Strings, brass, guitars and more',
    trackType: 'midi',
    instrument: 'soundfont',
  },
  {
    kind: 'drums',
    label: 'Drums',
    description: 'Program a beat on the drum machine',
    trackType: 'midi',
    instrument: 'drum-machine',
  },
  {
    kind: 'sampler',
    label: 'Sampler',
    description: 'Chop and play a sample',
    trackType: 'midi',
    instrument: 'sampler',
  },
  {
    kind: 'voice',
    label: 'Voice',
    description: 'Record singing or any sound',
    trackType: 'audio',
    instrument: 'vocal-fx',
  },
  {
    kind: 'guitar',
    label: 'Guitar',
    description: 'Record a guitar through an interface',
    trackType: 'audio',
    instrument: 'guitar-fx',
  },
  {
    kind: 'bass',
    label: 'Bass',
    description: 'Record a bass through an interface',
    trackType: 'audio',
    instrument: 'bass-fx',
  },
];

export function templateOf(kind: TrackKind): TrackTemplate {
  const template = TRACK_TEMPLATES.find((t) => t.kind === kind);
  if (!template) throw new Error(`No track template "${kind}"`);
  return template;
}
