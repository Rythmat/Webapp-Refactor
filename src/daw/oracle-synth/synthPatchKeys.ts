import type { SynthStore } from '@/daw/oracle-synth/store/storeTypes';

// ── What an Oracle track's patch is ────────────────────────────────────────
//
// The one list of synth-store keys that make up a track's patch: what is
// cached per track, saved with the project, and watched for changes. It
// lives apart from synthTrackState (which re-exports it) and imports no
// store, so the project document registry and the save status can read it
// without loading the synth.

/**
 * The audio-relevant keys of the synth store that define a track's patch.
 * A superset of PresetData (adds presetName + pitchBendRange): everything
 * that must round-trip so a saved project sounds and looks identical on
 * reload. Leaves out transient runtime state (pitchBend, modWheel,
 * activeNotes) and UI state (selectedSection, activeLFOBar, …).
 */
export const SYNTH_STATE_KEYS = [
  'oscillators',
  'subOscillator',
  'noise',
  'filters',
  'envelopes',
  'lfos',
  'modRoutes',
  'voiceMode',
  'voiceCount',
  'glide',
  'spread',
  'masterVolume',
  'fx',
  'fxRoutes',
  'routing',
  'arp',
  'macros',
  'keyScale',
  'presetName',
  'pitchBendRange',
  'bpm',
] as const satisfies readonly (keyof SynthStore)[];

/** A track's patch: exactly the SYNTH_STATE_KEYS of the synth store. */
export type SynthTrackState = Pick<
  SynthStore,
  (typeof SYNTH_STATE_KEYS)[number]
>;
