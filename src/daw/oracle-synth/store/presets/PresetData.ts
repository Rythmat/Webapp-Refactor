import {
  OscillatorParams,
  SubOscillatorParams,
  NoiseParams,
  FilterParams,
  EnvelopeParams,
  LFOParams,
  MacroParams,
  ModRoute,
  VoiceMode,
  FXParams,
  FXRoute,
  RoutingConfig,
  ArpParams,
} from '../../audio/types';
import { KeyScaleParams } from '../slices/keyScaleSlice';

/**
 * Serializable snapshot of all audio-relevant state.
 * Excludes transient state (pitchBend, modWheel, activeNotes)
 * and UI state (activeLFOBar, selectedSection, etc).
 *
 * Version history:
 *  1 — original format; modRoutes carry {lfoIndex, depthMin, depthMax}
 *  2 — modRoutes v2 ({source, amount, polarity, curve}); adds macros,
 *      keyScale. v1 data is migrated on load in applyPresetData().
 *  3 — oscillators gain warpMode/warpAmount; fx gains a reverb slot.
 *      Older data is backfilled with defaults on load (inert: warp 'none',
 *      reverb disabled) so v1/v2 presets sound identical.
 */
export const PRESET_VERSION = 3;

export interface PresetData {
  name: string;
  version: number;
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
  macros?: MacroParams[]; // v2+
  keyScale?: KeyScaleParams; // v2+
}

export interface StoredPreset {
  name: string;
  data: PresetData;
  isFactory: boolean;
}
