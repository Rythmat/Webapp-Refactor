import {
  OscillatorParams,
  SubOscillatorParams,
  NoiseParams,
  FilterParams,
  EnvelopeParams,
  LFOParams,
  ModRoute,
  VoiceMode,
  FXParams,
  FXRoute,
  RoutingConfig,
  ArpParams,
} from '../../audio/types';

/**
 * Serializable snapshot of all audio-relevant state.
 * Excludes transient state (pitchBend, modWheel, activeNotes)
 * and UI state (activeLFOBar, selectedSection, etc).
 */
export interface PresetData {
  name: string;
  version: 1;
  oscillators: [OscillatorParams, OscillatorParams];
  subOscillator: SubOscillatorParams;
  noise: NoiseParams;
  filters: [FilterParams, FilterParams];
  envelopes: [EnvelopeParams, EnvelopeParams];
  lfos: [LFOParams, LFOParams, LFOParams, LFOParams];
  modRoutes: ModRoute[];
  voiceMode: VoiceMode;
  voiceCount: number;
  glide: number;
  spread: number;
  masterVolume: number;
  fx?: FXParams; // Optional for backward compat with old presets
  fxRoutes?: FXRoute[]; // Optional for backward compat
  routing?: RoutingConfig; // Optional for backward compat
  arp?: ArpParams; // Optional for backward compat
}

export interface StoredPreset {
  name: string;
  data: PresetData;
  isFactory: boolean;
}
