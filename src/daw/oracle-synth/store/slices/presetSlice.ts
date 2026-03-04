import { StateCreator } from 'zustand';
import { PresetData, StoredPreset } from '../presets/PresetData';
import { FACTORY_PRESETS, INITIALIZE } from '../presets/factoryPresets';
import { DEFAULT_FX } from './fxSlice';
import { DEFAULT_ROUTING } from './routingSlice';
import { DEFAULT_ARP } from './arpSlice';
import type { SynthStore } from '../storeTypes';

const STORAGE_KEY = 'oracle-synth-presets';

function loadUserPresets(): StoredPreset[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as StoredPreset[];
  } catch {
    return [];
  }
}

function saveUserPresets(presets: StoredPreset[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
  } catch {
    // Storage full or unavailable — silently fail
  }
}

/** Extract serializable preset data from current store state */
function extractPresetData(state: SynthStore, name: string): PresetData {
  return {
    name,
    version: 1,
    oscillators: structuredClone(state.oscillators),
    subOscillator: structuredClone(state.subOscillator),
    noise: structuredClone(state.noise),
    filters: structuredClone(state.filters),
    envelopes: structuredClone(state.envelopes),
    lfos: structuredClone(state.lfos),
    modRoutes: structuredClone(state.modRoutes),
    voiceMode: state.voiceMode,
    voiceCount: state.voiceCount,
    glide: state.glide,
    spread: state.spread,
    masterVolume: state.masterVolume,
    fx: structuredClone(state.fx),
    fxRoutes: structuredClone(state.fxRoutes),
    routing: structuredClone(state.routing),
    arp: structuredClone(state.arp),
  };
}

/** Apply preset data to store (returns partial state for set()) */
function applyPresetData(data: PresetData): Partial<SynthStore> {
  // Migrate LFO data: old presets may lack the `smooths` field
  const lfos = structuredClone(data.lfos);
  for (const lfo of lfos) {
    if (!lfo.smooths) {
      lfo.smooths = [0, 0, 0, 0];
    }
    // Migrate rateDivs: old presets have flat [RateDiv, RateDiv, RateDiv, RateDiv]
    // New format is nested [[RateDiv x4], [RateDiv x4], [RateDiv x4], [RateDiv x4]]
    if (lfo.rateDivs && typeof lfo.rateDivs[0] === 'string') {
      const flat = lfo.rateDivs as unknown as string[];
      lfo.rateDivs = flat.map((r) => [r, r, r, r]) as typeof lfo.rateDivs;
    }
    // Migrate rateModifiers: old presets may lack this field
    if (!lfo.rateModifiers) {
      lfo.rateModifiers = ['normal', 'normal', 'normal', 'normal'];
    }
  }

  // Migrate FX data: old presets may lack the `fx` field
  const fx = data.fx ? structuredClone(data.fx) : structuredClone(DEFAULT_FX);

  // Migrate FX routes: old presets may lack the `fxRoutes` field
  const fxRoutes = data.fxRoutes ? structuredClone(data.fxRoutes) : [];

  // Migrate routing: old presets may lack the `routing` field
  const routing = data.routing ? structuredClone(data.routing) : structuredClone(DEFAULT_ROUTING);

  // Migrate arp: old presets may lack the `arp` field
  const arp = data.arp ? structuredClone(data.arp) : structuredClone(DEFAULT_ARP);

  return {
    presetName: data.name,
    isDirty: false,
    oscillators: structuredClone(data.oscillators),
    subOscillator: structuredClone(data.subOscillator),
    noise: structuredClone(data.noise),
    filters: structuredClone(data.filters),
    envelopes: structuredClone(data.envelopes),
    lfos,
    modRoutes: structuredClone(data.modRoutes),
    voiceMode: data.voiceMode,
    voiceCount: data.voiceCount,
    glide: data.glide,
    spread: data.spread,
    masterVolume: data.masterVolume,
    fx,
    fxRoutes,
    routing,
    arp,
  };
}

export interface PresetSlice {
  presetName: string;
  isDirty: boolean;
  userPresets: StoredPreset[];
  setPresetName: (name: string) => void;
  markDirty: () => void;
  loadPreset: (name: string) => void;
  savePreset: (name: string) => void;
  deletePreset: (name: string) => void;
  exportPreset: () => string;
  importPreset: (json: string) => boolean;
  initPreset: () => void;
  getPresetList: () => { name: string; isFactory: boolean }[];
}

export const createPresetSlice: StateCreator<
  SynthStore,
  [],
  [],
  PresetSlice
> = (set, get) => ({
  presetName: 'INITIALIZE',
  isDirty: false,
  userPresets: loadUserPresets(),

  setPresetName: (name) => set({ presetName: name }),
  markDirty: () => set({ isDirty: true }),

  loadPreset: (name) => {
    // Check factory presets first
    const factory = FACTORY_PRESETS.find((p) => p.name === name);
    if (factory) {
      set(applyPresetData(factory) as Partial<SynthStore>);
      return;
    }
    // Check user presets
    const state = get();
    const user = state.userPresets.find((p) => p.name === name);
    if (user) {
      set(applyPresetData(user.data) as Partial<SynthStore>);
    }
  },

  savePreset: (name) => {
    const state = get();
    const data = extractPresetData(state, name);
    const stored: StoredPreset = { name, data, isFactory: false };

    const existing = state.userPresets.filter((p) => p.name !== name);
    const updated = [...existing, stored];
    saveUserPresets(updated);
    set({ userPresets: updated, presetName: name, isDirty: false });
  },

  deletePreset: (name) => {
    const state = get();
    const updated = state.userPresets.filter((p) => p.name !== name);
    saveUserPresets(updated);
    set({ userPresets: updated });
  },

  exportPreset: () => {
    const state = get();
    const data = extractPresetData(state, state.presetName);
    return JSON.stringify(data, null, 2);
  },

  importPreset: (json) => {
    try {
      const data = JSON.parse(json) as PresetData;
      if (!data.name || !data.version || !data.oscillators) return false;
      set(applyPresetData(data) as Partial<SynthStore>);
      return true;
    } catch {
      return false;
    }
  },

  initPreset: () => {
    set(applyPresetData(INITIALIZE) as Partial<SynthStore>);
  },

  getPresetList: () => {
    const state = get();
    const factory = FACTORY_PRESETS.map((p) => ({
      name: p.name,
      isFactory: true,
    }));
    const user = state.userPresets.map((p) => ({
      name: p.name,
      isFactory: false,
    }));
    return [...factory, ...user];
  },
});
