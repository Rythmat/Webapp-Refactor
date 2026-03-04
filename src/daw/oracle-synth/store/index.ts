import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { createOscillatorSlice } from './slices/oscillatorSlice';
import { createSubOscillatorSlice } from './slices/subOscillatorSlice';
import { createNoiseSlice } from './slices/noiseSlice';
import { createFilterSlice } from './slices/filterSlice';
import { createEnvelopeSlice } from './slices/envelopeSlice';
import { createLFOSlice } from './slices/lfoSlice';
import { createModulationSlice } from './slices/modulationSlice';
import { createVoiceSlice } from './slices/voiceSlice';
import { createPresetSlice } from './slices/presetSlice';
import { createGlobalSlice } from './slices/globalSlice';
import { createUISlice } from './slices/uiSlice';
import { createFXSlice } from './slices/fxSlice';
import { createRoutingSlice } from './slices/routingSlice';
import { createArpSlice } from './slices/arpSlice';
import type { SynthStore } from './storeTypes';

export type { SynthStore };

export const useSynthStore = create<SynthStore>()(
  subscribeWithSelector((...args) => ({
    ...createOscillatorSlice(...args),
    ...createSubOscillatorSlice(...args),
    ...createNoiseSlice(...args),
    ...createFilterSlice(...args),
    ...createEnvelopeSlice(...args),
    ...createLFOSlice(...args),
    ...createModulationSlice(...args),
    ...createVoiceSlice(...args),
    ...createPresetSlice(...args),
    ...createGlobalSlice(...args),
    ...createUISlice(...args),
    ...createFXSlice(...args),
    ...createRoutingSlice(...args),
    ...createArpSlice(...args),
  }))
);

// Mark preset as dirty when any audio parameter changes
useSynthStore.subscribe(
  (s) => [
    s.oscillators,
    s.subOscillator,
    s.noise,
    s.filters,
    s.envelopes,
    s.lfos,
    s.modRoutes,
    s.voiceMode,
    s.voiceCount,
    s.glide,
    s.spread,
    s.masterVolume,
    s.fx,
    s.fxRoutes,
    s.routing,
    s.arp,
  ],
  () => {
    const { isDirty, markDirty } = useSynthStore.getState();
    if (!isDirty) markDirty();
  },
  { equalityFn: (a, b) => a.every((v, i) => v === b[i]) }
);
