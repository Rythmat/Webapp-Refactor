/**
 * Factory presets for the wavetable synthesizer.
 */

import type { SynthPreset } from './synth-engine';
import { DEFAULT_SYNTH_PRESET } from './synth-engine';

export interface PresetCategory {
  name: string;
  presets: SynthPreset[];
}

/** Helper to create a preset by merging overrides onto the default */
function p(overrides: Partial<SynthPreset> & { name: string; category: string }): SynthPreset {
  return {
    ...DEFAULT_SYNTH_PRESET,
    ...overrides,
    sub: { ...DEFAULT_SYNTH_PRESET.sub, ...overrides.sub },
    osc1: { ...DEFAULT_SYNTH_PRESET.osc1, ...overrides.osc1 },
    osc2: { ...DEFAULT_SYNTH_PRESET.osc2, ...overrides.osc2 },
    noise: { ...DEFAULT_SYNTH_PRESET.noise, ...overrides.noise },
    filter1: { ...DEFAULT_SYNTH_PRESET.filter1, ...overrides.filter1 },
    filter2: { ...DEFAULT_SYNTH_PRESET.filter2, ...overrides.filter2 },
    ampEnvelope: { ...DEFAULT_SYNTH_PRESET.ampEnvelope, ...overrides.ampEnvelope },
    filterEnvelope: { ...DEFAULT_SYNTH_PRESET.filterEnvelope, ...overrides.filterEnvelope },
    lfo1: { ...DEFAULT_SYNTH_PRESET.lfo1, ...overrides.lfo1 },
    lfo2: { ...DEFAULT_SYNTH_PRESET.lfo2, ...overrides.lfo2 },
    lfo3: { ...DEFAULT_SYNTH_PRESET.lfo3, ...overrides.lfo3 },
    lfo4: { ...DEFAULT_SYNTH_PRESET.lfo4, ...overrides.lfo4 },
    unison: { ...DEFAULT_SYNTH_PRESET.unison, ...overrides.unison },
    modMatrix: overrides.modMatrix ?? [],
  };
}

export const FACTORY_PRESETS: SynthPreset[] = [
  // === Init ===
  { ...DEFAULT_SYNTH_PRESET },

  // === Pads ===
  p({
    name: 'Warm Pad',
    category: 'Pads',
    osc1: { enabled: true, waveform: 'sawtooth', wtPosition: 0.3, octave: 0, semitone: 0, fine: -8, level: 0.5 },
    osc2: { enabled: true, waveform: 'sawtooth', wtPosition: 0.3, octave: 0, semitone: 0, fine: 8, level: 0.5 },
    filter1: { enabled: true, type: 'lowpass', slope: 24, cutoff: 2000, resonance: 0.5, keyTracking: 0.3, envelopeAmount: 0.2 },
    ampEnvelope: { attack: 0.8, decay: 1.0, sustain: 0.8, release: 1.5 },
    filterEnvelope: { attack: 1.0, decay: 1.5, sustain: 0.5, release: 2.0 },
    unison: { voices: 4, detune: 20, blend: 0.7 },
    masterGain: 0.6,
  }),

  p({
    name: 'Lush Strings',
    category: 'Pads',
    osc1: { enabled: true, waveform: 'sawtooth', wtPosition: 0.6, octave: 0, semitone: 0, fine: -5, level: 0.5 },
    osc2: { enabled: true, waveform: 'sawtooth', wtPosition: 0.6, octave: 1, semitone: 0, fine: 5, level: 0.3 },
    filter1: { enabled: true, type: 'lowpass', slope: 24, cutoff: 3000, resonance: 0.3, keyTracking: 0.5, envelopeAmount: 0.15 },
    ampEnvelope: { attack: 1.2, decay: 0.5, sustain: 0.9, release: 2.0 },
    filterEnvelope: { attack: 1.5, decay: 2.0, sustain: 0.6, release: 2.5 },
    unison: { voices: 6, detune: 25, blend: 0.8 },
    lfo1: { enabled: true, shape: 'triangle', rate: 0.3, depth: 0.15 },
    modMatrix: [{ source: 'lfo1', target: 'filter1Cutoff', amount: 0.2 }],
    masterGain: 0.55,
  }),

  p({
    name: 'Digital Shimmer',
    category: 'Pads',
    osc1: { enabled: true, waveform: 'square', wtPosition: 0.4, octave: 0, semitone: 0, fine: 0, level: 0.4 },
    osc2: { enabled: true, waveform: 'triangle', wtPosition: 0.7, octave: 1, semitone: 7, fine: 3, level: 0.25 },
    noise: { type: 'white', level: 0.03 },
    filter1: { enabled: true, type: 'lowpass', slope: 12, cutoff: 5000, resonance: 1.5, keyTracking: 0.6, envelopeAmount: 0.3 },
    ampEnvelope: { attack: 0.5, decay: 1.0, sustain: 0.7, release: 3.0 },
    filterEnvelope: { attack: 0.8, decay: 1.5, sustain: 0.4, release: 3.0 },
    unison: { voices: 4, detune: 30, blend: 0.9 },
    masterGain: 0.5,
  }),

  // === Leads ===
  p({
    name: 'Acid Lead',
    category: 'Leads',
    osc1: { enabled: true, waveform: 'sawtooth', wtPosition: 1.0, octave: 0, semitone: 0, fine: 0, level: 0.8 },
    filter1: { enabled: true, type: 'lowpass', slope: 24, cutoff: 800, resonance: 12, keyTracking: 0.3, envelopeAmount: 0.8 },
    ampEnvelope: { attack: 0.005, decay: 0.2, sustain: 0.6, release: 0.15 },
    filterEnvelope: { attack: 0.005, decay: 0.3, sustain: 0.1, release: 0.2 },
    masterGain: 0.7,
  }),

  p({
    name: 'Supersaw Lead',
    category: 'Leads',
    osc1: { enabled: true, waveform: 'sawtooth', wtPosition: 0.9, octave: 0, semitone: 0, fine: 0, level: 0.6 },
    osc2: { enabled: true, waveform: 'sawtooth', wtPosition: 0.9, octave: 0, semitone: 0, fine: 7, level: 0.4 },
    filter1: { enabled: true, type: 'lowpass', slope: 24, cutoff: 6000, resonance: 1.0, keyTracking: 0.5, envelopeAmount: 0.3 },
    ampEnvelope: { attack: 0.01, decay: 0.15, sustain: 0.8, release: 0.2 },
    filterEnvelope: { attack: 0.01, decay: 0.3, sustain: 0.5, release: 0.3 },
    unison: { voices: 7, detune: 35, blend: 0.6 },
    masterGain: 0.55,
  }),

  p({
    name: 'Square Lead',
    category: 'Leads',
    osc1: { enabled: true, waveform: 'square', wtPosition: 0.8, octave: 0, semitone: 0, fine: 0, level: 0.7 },
    sub: { enabled: true, waveform: 'square', octave: -1, level: 0.3 },
    filter1: { enabled: true, type: 'lowpass', slope: 12, cutoff: 4500, resonance: 2.0, keyTracking: 0.5, envelopeAmount: 0.25 },
    ampEnvelope: { attack: 0.005, decay: 0.1, sustain: 0.9, release: 0.1 },
    filterEnvelope: { attack: 0.01, decay: 0.2, sustain: 0.6, release: 0.15 },
    masterGain: 0.65,
  }),

  // === Bass ===
  p({
    name: 'Analog Bass',
    category: 'Bass',
    osc1: { enabled: true, waveform: 'sawtooth', wtPosition: 0.8, octave: -1, semitone: 0, fine: 0, level: 0.7 },
    sub: { enabled: true, waveform: 'sine', octave: -1, level: 0.6 },
    filter1: { enabled: true, type: 'lowpass', slope: 24, cutoff: 1200, resonance: 3, keyTracking: 0.2, envelopeAmount: 0.5 },
    ampEnvelope: { attack: 0.005, decay: 0.3, sustain: 0.5, release: 0.1 },
    filterEnvelope: { attack: 0.005, decay: 0.25, sustain: 0.2, release: 0.15 },
    masterGain: 0.75,
  }),

  p({
    name: 'Sub Bass',
    category: 'Bass',
    osc1: { enabled: true, waveform: 'sine', wtPosition: 0, octave: -1, semitone: 0, fine: 0, level: 0.8 },
    sub: { enabled: true, waveform: 'sine', octave: -2, level: 0.5 },
    filter1: { enabled: true, type: 'lowpass', slope: 24, cutoff: 500, resonance: 0.5, keyTracking: 0, envelopeAmount: 0.1 },
    ampEnvelope: { attack: 0.01, decay: 0.1, sustain: 0.9, release: 0.15 },
    masterGain: 0.8,
  }),

  p({
    name: 'Wobble Bass',
    category: 'Bass',
    osc1: { enabled: true, waveform: 'sawtooth', wtPosition: 1.0, octave: -1, semitone: 0, fine: 0, level: 0.7 },
    osc2: { enabled: true, waveform: 'square', wtPosition: 0.7, octave: -1, semitone: 0, fine: -5, level: 0.4 },
    filter1: { enabled: true, type: 'lowpass', slope: 24, cutoff: 800, resonance: 8, keyTracking: 0, envelopeAmount: 0.1 },
    ampEnvelope: { attack: 0.005, decay: 0.15, sustain: 0.8, release: 0.1 },
    lfo1: { enabled: true, shape: 'sine', rate: 3.0, depth: 0.8 },
    modMatrix: [{ source: 'lfo1', target: 'filter1Cutoff', amount: 0.7 }],
    masterGain: 0.65,
  }),

  // === Keys ===
  p({
    name: 'Electric Piano',
    category: 'Keys',
    osc1: { enabled: true, waveform: 'sine', wtPosition: 0.15, octave: 0, semitone: 0, fine: 0, level: 0.7 },
    osc2: { enabled: true, waveform: 'triangle', wtPosition: 0.3, octave: 1, semitone: 0, fine: 0, level: 0.2 },
    filter1: { enabled: true, type: 'lowpass', slope: 12, cutoff: 5000, resonance: 0.5, keyTracking: 0.7, envelopeAmount: 0.2 },
    ampEnvelope: { attack: 0.005, decay: 1.0, sustain: 0.3, release: 0.5 },
    filterEnvelope: { attack: 0.005, decay: 0.8, sustain: 0.2, release: 0.5 },
    masterGain: 0.7,
  }),

  p({
    name: 'Organ',
    category: 'Keys',
    osc1: { enabled: true, waveform: 'sine', wtPosition: 0, octave: 0, semitone: 0, fine: 0, level: 0.5 },
    osc2: { enabled: true, waveform: 'sine', wtPosition: 0, octave: 1, semitone: 0, fine: 0, level: 0.4 },
    sub: { enabled: true, waveform: 'sine', octave: -1, level: 0.4 },
    filter1: { enabled: true, type: 'lowpass', slope: 12, cutoff: 6000, resonance: 0.3, keyTracking: 0.5, envelopeAmount: 0 },
    ampEnvelope: { attack: 0.01, decay: 0.05, sustain: 0.95, release: 0.08 },
    lfo1: { enabled: true, shape: 'sine', rate: 5.5, depth: 0.15 },
    modMatrix: [{ source: 'lfo1', target: 'ampLevel', amount: 0.3 }],
    masterGain: 0.6,
  }),

  // === Plucks ===
  p({
    name: 'Digital Pluck',
    category: 'Plucks',
    osc1: { enabled: true, waveform: 'sawtooth', wtPosition: 0.7, octave: 0, semitone: 0, fine: 0, level: 0.7 },
    osc2: { enabled: true, waveform: 'square', wtPosition: 0.5, octave: 0, semitone: 0, fine: 3, level: 0.3 },
    filter1: { enabled: true, type: 'lowpass', slope: 24, cutoff: 3000, resonance: 2.0, keyTracking: 0.5, envelopeAmount: 0.7 },
    ampEnvelope: { attack: 0.003, decay: 0.4, sustain: 0.05, release: 0.3 },
    filterEnvelope: { attack: 0.003, decay: 0.3, sustain: 0.05, release: 0.25 },
    masterGain: 0.7,
  }),

  p({
    name: 'Soft Pluck',
    category: 'Plucks',
    osc1: { enabled: true, waveform: 'triangle', wtPosition: 0.4, octave: 0, semitone: 0, fine: 0, level: 0.7 },
    filter1: { enabled: true, type: 'lowpass', slope: 12, cutoff: 4000, resonance: 1.0, keyTracking: 0.6, envelopeAmount: 0.5 },
    ampEnvelope: { attack: 0.002, decay: 0.6, sustain: 0.02, release: 0.4 },
    filterEnvelope: { attack: 0.002, decay: 0.4, sustain: 0.05, release: 0.3 },
    masterGain: 0.65,
  }),

  // === Strings ===
  p({
    name: 'Analog Strings',
    category: 'Strings',
    osc1: { enabled: true, waveform: 'sawtooth', wtPosition: 0.5, octave: 0, semitone: 0, fine: -6, level: 0.5 },
    osc2: { enabled: true, waveform: 'sawtooth', wtPosition: 0.5, octave: 0, semitone: 0, fine: 6, level: 0.5 },
    filter1: { enabled: true, type: 'lowpass', slope: 24, cutoff: 3500, resonance: 0.5, keyTracking: 0.4, envelopeAmount: 0.15 },
    ampEnvelope: { attack: 0.6, decay: 0.5, sustain: 0.85, release: 1.0 },
    filterEnvelope: { attack: 0.8, decay: 1.0, sustain: 0.5, release: 1.5 },
    unison: { voices: 4, detune: 18, blend: 0.6 },
    masterGain: 0.55,
  }),

  // === FX ===
  p({
    name: 'Noise Sweep',
    category: 'FX',
    osc1: { enabled: false, waveform: 'sawtooth', wtPosition: 0.5, octave: 0, semitone: 0, fine: 0, level: 0 },
    noise: { type: 'white', level: 0.7 },
    filter1: { enabled: true, type: 'bandpass', slope: 24, cutoff: 1000, resonance: 8, keyTracking: 0, envelopeAmount: 0.9 },
    ampEnvelope: { attack: 0.5, decay: 2.0, sustain: 0.3, release: 2.0 },
    filterEnvelope: { attack: 0.1, decay: 3.0, sustain: 0.1, release: 2.0 },
    masterGain: 0.5,
  }),

  p({
    name: 'Metallic Hit',
    category: 'FX',
    osc1: { enabled: true, waveform: 'square', wtPosition: 1.0, octave: 1, semitone: 7, fine: 0, level: 0.5 },
    osc2: { enabled: true, waveform: 'sawtooth', wtPosition: 1.0, octave: 2, semitone: 0, fine: 13, level: 0.4 },
    noise: { type: 'white', level: 0.15 },
    filter1: { enabled: true, type: 'bandpass', slope: 12, cutoff: 3000, resonance: 6, keyTracking: 0.8, envelopeAmount: 0.6 },
    ampEnvelope: { attack: 0.001, decay: 0.3, sustain: 0.0, release: 0.5 },
    filterEnvelope: { attack: 0.001, decay: 0.2, sustain: 0.05, release: 0.3 },
    masterGain: 0.6,
  }),

  p({
    name: 'Ambient Drone',
    category: 'FX',
    osc1: { enabled: true, waveform: 'sawtooth', wtPosition: 0.2, octave: -1, semitone: 0, fine: -3, level: 0.4 },
    osc2: { enabled: true, waveform: 'triangle', wtPosition: 0.3, octave: 0, semitone: 7, fine: 5, level: 0.3 },
    sub: { enabled: true, waveform: 'sine', octave: -2, level: 0.3 },
    noise: { type: 'pink', level: 0.05 },
    filter1: { enabled: true, type: 'lowpass', slope: 24, cutoff: 1500, resonance: 2, keyTracking: 0.2, envelopeAmount: 0.1 },
    ampEnvelope: { attack: 3.0, decay: 2.0, sustain: 0.7, release: 4.0 },
    filterEnvelope: { attack: 4.0, decay: 3.0, sustain: 0.5, release: 5.0 },
    lfo1: { enabled: true, shape: 'sine', rate: 0.15, depth: 0.4 },
    modMatrix: [{ source: 'lfo1', target: 'filter1Cutoff', amount: 0.3 }],
    unison: { voices: 3, detune: 12, blend: 0.9 },
    masterGain: 0.45,
  }),
];

/** Presets grouped by category for UI display */
export const PRESET_CATEGORIES: PresetCategory[] = (() => {
  const map = new Map<string, SynthPreset[]>();
  for (const preset of FACTORY_PRESETS) {
    const cat = preset.category;
    if (!map.has(cat)) map.set(cat, []);
    map.get(cat)!.push(preset);
  }
  return Array.from(map.entries()).map(([name, presets]) => ({ name, presets }));
})();
