import type { OscillatorSlice } from './slices/oscillatorSlice';
import type { SubOscillatorSlice } from './slices/subOscillatorSlice';
import type { NoiseSlice } from './slices/noiseSlice';
import type { FilterSlice } from './slices/filterSlice';
import type { EnvelopeSlice } from './slices/envelopeSlice';
import type { LFOSlice } from './slices/lfoSlice';
import type { ModulationSlice } from './slices/modulationSlice';
import type { VoiceSlice } from './slices/voiceSlice';
import type { PresetSlice } from './slices/presetSlice';
import type { GlobalSlice } from './slices/globalSlice';
import type { UISlice } from './slices/uiSlice';
import type { FXSlice } from './slices/fxSlice';
import type { RoutingSlice } from './slices/routingSlice';
import type { ArpSlice } from './slices/arpSlice';

export type SynthStore = OscillatorSlice &
  SubOscillatorSlice &
  NoiseSlice &
  FilterSlice &
  EnvelopeSlice &
  LFOSlice &
  ModulationSlice &
  VoiceSlice &
  PresetSlice &
  GlobalSlice &
  UISlice &
  FXSlice &
  RoutingSlice &
  ArpSlice;
