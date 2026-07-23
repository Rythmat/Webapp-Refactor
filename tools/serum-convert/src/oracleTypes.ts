// Oracle PresetData v2 output shape — mirrors
// src/daw/oracle-synth/store/presets/PresetData.ts + audio/types.ts.
// Kept tool-local so the converter runs under plain Node type-stripping
// (the app modules pull in zustand/@prism aliases the tool can't resolve).
// The golden-file test pins this against a real app-imported preset.

export type BasicWaveform = 'sine' | 'triangle' | 'sawtooth' | 'square';

export type OscWarpMode =
  | 'none'
  | 'hardclip'
  | 'softclip'
  | 'tube'
  | 'tapesat'
  | 'rectify'
  | 'sineshaper'
  | 'diode'
  | 'fold'
  | 'crush'
  | 'sync'
  | 'pwm'
  | 'bend'
  | 'squeeze'
  | 'quantize'
  | 'flip';

export type FilterType =
  | 'lowpass'
  | 'highpass'
  | 'bandpass'
  | 'notch'
  | 'allpass'
  | 'peaking'
  | 'lowshelf'
  | 'highshelf';

export interface OscillatorParamsOut {
  waveform: BasicWaveform;
  wavetable: string;
  octave: number;
  semitone: number;
  fine: number;
  wtPosition: number;
  pan: number;
  level: number;
  unisonVoices: number;
  unisonDetune: number;
  unisonBlend: number;
  warpMode: OscWarpMode;
  warpAmount: number;
  enabled: boolean;
}

export interface SubOscillatorParamsOut {
  waveform: BasicWaveform;
  octave: number;
  semitone: number;
  fine: number;
  level: number;
  pan: number;
  enabled: boolean;
}

export interface NoiseParamsOut {
  type: 'white' | 'pink';
  level: number;
  pan: number;
  enabled: boolean;
}

export interface FilterParamsOut {
  type: FilterType;
  cutoff: number;
  resonance: number;
  pan: number;
  gain: number;
  mix: number;
  enabled: boolean;
}

export interface EnvelopeParamsOut {
  attack: number;
  decay: number;
  sustain: number;
  release: number;
}

export interface LFONodeOut {
  time: number;
  value: number;
  curve?: number;
}

export type QuarterRatesOut = [string, string, string, string];

export interface LFOParamsOut {
  rateDivs: [
    QuarterRatesOut,
    QuarterRatesOut,
    QuarterRatesOut,
    QuarterRatesOut,
  ];
  rateModifiers: [string, string, string, string];
  smooths: [number, number, number, number];
  sync: boolean;
  bars: [LFONodeOut[], LFONodeOut[], LFONodeOut[], LFONodeOut[]];
}

export interface ModRouteOut {
  id: string;
  source: { type: string; index: number };
  target: { source: string; param: string };
  amount: number;
  polarity: 'unipolar' | 'bipolar';
  curve?: 'linear' | 'exp' | 'log' | 'scurve';
  transform?: string;
  enabled: boolean;
}

export interface MacroParamsOut {
  name: string;
  value: number;
}

export interface PresetDataOut {
  name: string;
  version: number;
  oscillators: [OscillatorParamsOut, OscillatorParamsOut];
  subOscillator: SubOscillatorParamsOut;
  noise: NoiseParamsOut;
  filters: [FilterParamsOut, FilterParamsOut];
  envelopes: [EnvelopeParamsOut, EnvelopeParamsOut];
  lfos: [LFOParamsOut, LFOParamsOut, LFOParamsOut, LFOParamsOut];
  modRoutes: ModRouteOut[];
  voiceMode: 'poly' | 'legato' | 'mono';
  voiceCount: number;
  glide: number;
  spread: number;
  masterVolume: number;
  fx: {
    chorus: { enabled: boolean; rate: number; depth: number; mix: number };
    delay: { enabled: boolean; time: number; feedback: number; mix: number };
    phaser: { enabled: boolean; rate: number; depth: number; mix: number };
    compressor: {
      enabled: boolean;
      threshold: number;
      ratio: number;
      attack: number;
      release: number;
    };
    drive: { enabled: boolean; amount: number; mix: number };
    reverb: {
      enabled: boolean;
      size: number;
      decay: number;
      damping: number;
      mix: number;
    };
  };
  fxRoutes: unknown[];
  routing: {
    filterRouting: { filter1Sources: string[]; filter2Sources: string[] };
    envelopeRouting: { env1Sources: string[]; env2Sources: string[] };
  };
  arp: {
    enabled: boolean;
    rate: string;
    style: string;
    distance: number;
    step: number;
    chordAware: boolean;
  };
  macros: MacroParamsOut[];
  keyScale: {
    enabled: boolean;
    followProjectKey: boolean;
    rootPc: number;
    mode: string;
    snapMode: string;
  };
}

export const DEFAULT_LFO: LFOParamsOut = {
  rateDivs: [
    ['1/4', '1/4', '1/4', '1/4'],
    ['1/4', '1/4', '1/4', '1/4'],
    ['1/4', '1/4', '1/4', '1/4'],
    ['1/4', '1/4', '1/4', '1/4'],
  ],
  rateModifiers: ['normal', 'normal', 'normal', 'normal'],
  smooths: [0, 0, 0, 0],
  sync: true,
  bars: [
    [
      { time: 0, value: 0 },
      { time: 0.5, value: 1 },
      { time: 1, value: 0 },
    ],
    [
      { time: 0, value: 0 },
      { time: 0.5, value: 1 },
      { time: 1, value: 0 },
    ],
    [
      { time: 0, value: 0 },
      { time: 0.5, value: 1 },
      { time: 1, value: 0 },
    ],
    [
      { time: 0, value: 0 },
      { time: 0.5, value: 1 },
      { time: 1, value: 0 },
    ],
  ],
};

export function defaultPreset(name: string): PresetDataOut {
  return {
    name,
    version: 3,
    oscillators: [
      {
        waveform: 'sawtooth',
        wavetable: 'SAWTOOTH',
        octave: 0,
        semitone: 0,
        fine: 0,
        wtPosition: 0,
        pan: 0,
        level: 0.7,
        unisonVoices: 1,
        unisonDetune: 0,
        unisonBlend: 0.1,
        warpMode: 'none',
        warpAmount: 0,
        enabled: true,
      },
      {
        waveform: 'sawtooth',
        wavetable: 'SAWTOOTH',
        octave: 0,
        semitone: 0,
        fine: 0,
        wtPosition: 0,
        pan: 0,
        level: 0.7,
        unisonVoices: 1,
        unisonDetune: 0,
        unisonBlend: 0.1,
        warpMode: 'none',
        warpAmount: 0,
        enabled: false,
      },
    ],
    subOscillator: {
      waveform: 'sine',
      octave: -1,
      semitone: 0,
      fine: 0,
      level: 0.5,
      pan: 0,
      enabled: false,
    },
    noise: { type: 'white', level: 0.3, pan: 0, enabled: false },
    filters: [
      {
        type: 'lowpass',
        cutoff: 20000,
        resonance: 0,
        pan: 0,
        gain: 0,
        mix: 1,
        enabled: false,
      },
      {
        type: 'lowpass',
        cutoff: 20000,
        resonance: 0,
        pan: 0,
        gain: 0,
        mix: 1,
        enabled: false,
      },
    ],
    envelopes: [
      { attack: 0.01, decay: 0.1, sustain: 0.7, release: 0.3 },
      { attack: 0.01, decay: 0.5, sustain: 0.5, release: 0.5 },
    ],
    lfos: [
      structuredClone(DEFAULT_LFO),
      structuredClone(DEFAULT_LFO),
      structuredClone(DEFAULT_LFO),
      structuredClone(DEFAULT_LFO),
    ],
    modRoutes: [],
    voiceMode: 'poly',
    voiceCount: 8,
    glide: 0,
    spread: 0,
    masterVolume: 0.8,
    fx: {
      chorus: { enabled: false, rate: 0.8, depth: 0.3, mix: 0.5 },
      delay: { enabled: false, time: 0.3, feedback: 0.35, mix: 0.25 },
      phaser: { enabled: false, rate: 0.5, depth: 0.5, mix: 0.5 },
      compressor: {
        enabled: false,
        threshold: -18,
        ratio: 4,
        attack: 0.01,
        release: 0.2,
      },
      drive: { enabled: false, amount: 0.3, mix: 0.5 },
      reverb: { enabled: false, size: 0.5, decay: 0.5, damping: 0.3, mix: 0.3 },
    },
    fxRoutes: [],
    routing: {
      filterRouting: {
        filter1Sources: ['osc1', 'osc2', 'sub', 'noise'],
        filter2Sources: [],
      },
      envelopeRouting: {
        env1Sources: ['osc1', 'osc2', 'sub', 'noise'],
        env2Sources: [],
      },
    },
    arp: {
      enabled: false,
      rate: '1/8',
      style: 'up',
      distance: 12,
      step: 1,
      chordAware: false,
    },
    macros: Array.from({ length: 8 }, (_, i) => ({
      name: `MACRO ${i + 1}`,
      value: 0,
    })),
    keyScale: {
      enabled: false,
      followProjectKey: true,
      rootPc: 0,
      mode: 'ionian',
      snapMode: 'nearest',
    },
  };
}
