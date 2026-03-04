import { PresetData } from './PresetData';
import { LFONode, QuarterRates, FXParams, FXRoute, RoutingConfig, ArpParams } from '../../audio/types';
import { LFOWaveformBuilder } from '../../audio/LFOWaveformBuilder';

// 4-peak triangle for default 1/4 rate (4 cycles per bar)
const triangleNodes4 = (): LFONode[] =>
  LFOWaveformBuilder.presetNodes('triangle', 4);

// 8-cycle sine for 1/8 rate (8 cycles per bar)
const sineNodes8 = (): LFONode[] =>
  LFOWaveformBuilder.presetNodes('sine', 8);

// 2-cycle triangle for 1/2 rate
const triangleNodes2 = (): LFONode[] =>
  LFOWaveformBuilder.presetNodes('triangle', 2);

// Slow ramp (1 cycle per bar) with curved attack
const curvedRamp1 = (): LFONode[] => [
  { time: 0, value: 0, curve: 0.6 },
  { time: 0.8, value: 1, curve: -0.4 },
  { time: 1, value: 0 },
];

const qr = (r: string): QuarterRates => [r, r, r, r] as QuarterRates;

const defaultLFO = () => ({
  rateDivs: [qr('1/4'), qr('1/4'), qr('1/4'), qr('1/4')] as [QuarterRates, QuarterRates, QuarterRates, QuarterRates],
  rateModifiers: ['normal', 'normal', 'normal', 'normal'] as ['normal', 'normal', 'normal', 'normal'],
  smooths: [0, 0, 0, 0] as [number, number, number, number],
  sync: false,
  bars: [triangleNodes4(), triangleNodes4(), triangleNodes4(), triangleNodes4()] as [LFONode[], LFONode[], LFONode[], LFONode[]],
});

const defaultFX = (): FXParams => ({
  chorus: { enabled: false, rate: 1.5, depth: 0.5, mix: 0.5 },
  delay: { enabled: false, time: 0.3, feedback: 0.3, mix: 0.3 },
  phaser: { enabled: false, rate: 0.5, depth: 0.5, mix: 0.5 },
  compressor: { enabled: false, threshold: -24, ratio: 4, attack: 0.003, release: 0.25 },
  drive: { enabled: false, amount: 0.3, mix: 0.5 },
});

const defaultRouting = (): RoutingConfig => ({
  filterRouting: {
    filter1Sources: ['osc1', 'osc2', 'sub', 'noise'],
    filter2Sources: [],
  },
  envelopeRouting: {
    env1Sources: ['osc1', 'osc2', 'sub', 'noise'],
    env2Sources: [],
  },
});

const defaultArp = (): ArpParams => ({
  enabled: false,
  rate: '1/8',
  style: 'up',
  distance: 12,
  step: 1,
});

// Wobble: fast attack + curved decay, 4 cycles per bar
const wobbleNodes4 = (): LFONode[] => [
  { time: 0, value: 0, curve: 0.8 },
  { time: 0.08, value: 1, curve: -0.6 },
  { time: 0.25, value: 0, curve: 0.8 },
  { time: 0.33, value: 1, curve: -0.6 },
  { time: 0.5, value: 0, curve: 0.8 },
  { time: 0.58, value: 1, curve: -0.6 },
  { time: 0.75, value: 0, curve: 0.8 },
  { time: 0.83, value: 1, curve: -0.6 },
  { time: 1, value: 0 },
];

// Organic drift: asymmetric multi-node shape, 1 cycle per bar
const driftNodes1 = (): LFONode[] => [
  { time: 0, value: 0.15, curve: 0.5 },
  { time: 0.35, value: 0.85, curve: 0.3 },
  { time: 0.65, value: 0.3, curve: -0.4 },
  { time: 0.85, value: 0.7, curve: -0.3 },
  { time: 1, value: 0.15 },
];

// Gate: ramp-down shape with curve, 8 cycles per bar
const gateNodes8 = (): LFONode[] => {
  const nodes: LFONode[] = [];
  for (let i = 0; i < 8; i++) {
    const off = i / 8;
    const w = 1 / 8;
    nodes.push({ time: off, value: 1, curve: -0.5 });
    if (i < 7) nodes.push({ time: off + w * 0.95, value: 0 });
    else nodes.push({ time: 1, value: 0 });
  }
  return nodes;
};

// ─── INITIALIZE ────────────────────────────────────────
export const INITIALIZE: PresetData = {
  name: 'INITIALIZE',
  version: 1,
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
      level: 0.5,
      unisonVoices: 1,
      unisonDetune: 0,
      unisonBlend: 0.1,
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
  noise: { type: 'pink', level: 0.3, pan: 0, enabled: false },
  filters: [
    { type: 'lowpass', cutoff: 20000, resonance: 0, pan: 0, gain: 0, mix: 1, enabled: true },
    { type: 'lowpass', cutoff: 20000, resonance: 0, pan: 0, gain: 0, mix: 1, enabled: false },
  ],
  envelopes: [
    { attack: 0.01, decay: 0.1, sustain: 0.7, release: 0.3 },
    { attack: 0.01, decay: 0.5, sustain: 0.5, release: 0.5 },
  ],
  lfos: [defaultLFO(), defaultLFO(), defaultLFO(), defaultLFO()] as PresetData['lfos'],
  modRoutes: [],
  voiceMode: 'poly',
  voiceCount: 8,
  glide: 0,
  spread: 0,
  masterVolume: 0.8,
  fx: defaultFX(),
  fxRoutes: [],
  routing: defaultRouting(),
  arp: defaultArp(),
};

// ─── PAD ───────────────────────────────────────────────
// Lush evolving pad: two detuned saw oscillators with slow attack, filter modulation
export const PAD: PresetData = {
  name: 'PAD',
  version: 1,
  oscillators: [
    {
      waveform: 'sawtooth',
      wavetable: 'SAWTOOTH',
      octave: 0,
      semitone: 0,
      fine: -8,
      wtPosition: 0,
      pan: -0.3,
      level: 0.5,
      unisonVoices: 4,
      unisonDetune: 0.25,
      unisonBlend: 0.6,
      enabled: true,
    },
    {
      waveform: 'sawtooth',
      wavetable: 'SAWTOOTH',
      octave: 0,
      semitone: 0,
      fine: 8,
      wtPosition: 0,
      pan: 0.3,
      level: 0.5,
      unisonVoices: 4,
      unisonDetune: 0.3,
      unisonBlend: 0.6,
      enabled: true,
    },
  ],
  subOscillator: {
    waveform: 'sine',
    octave: -1,
    semitone: 0,
    fine: 0,
    level: 0.3,
    pan: 0,
    enabled: true,
  },
  noise: { type: 'pink', level: 0.05, pan: 0, enabled: true },
  filters: [
    { type: 'lowpass', cutoff: 3500, resonance: 2, pan: 0, gain: 0, mix: 1, enabled: true },
    { type: 'lowpass', cutoff: 20000, resonance: 0, pan: 0, gain: 0, mix: 1, enabled: false },
  ],
  envelopes: [
    { attack: 0.8, decay: 0.5, sustain: 0.8, release: 1.5 },
    { attack: 1.2, decay: 0.8, sustain: 0.6, release: 2.0 },
  ],
  lfos: [
    {
      rateDivs: [qr('1'), qr('1'), qr('1'), qr('1')] as [QuarterRates, QuarterRates, QuarterRates, QuarterRates],
      rateModifiers: ['normal', 'normal', 'normal', 'normal'] as ['normal', 'normal', 'normal', 'normal'],
      smooths: [0.6, 0.6, 0.6, 0.6] as [number, number, number, number],
      sync: false,
      bars: [curvedRamp1(), curvedRamp1(), curvedRamp1(), curvedRamp1()],
    },
    {
      rateDivs: [qr('1/2'), qr('1/2'), qr('1/2'), qr('1/2')] as [QuarterRates, QuarterRates, QuarterRates, QuarterRates],
      rateModifiers: ['normal', 'normal', 'normal', 'normal'] as ['normal', 'normal', 'normal', 'normal'],
      smooths: [0.4, 0.4, 0.4, 0.4] as [number, number, number, number],
      sync: false,
      bars: [triangleNodes2(), triangleNodes2(), triangleNodes2(), triangleNodes2()],
    },
    defaultLFO(),
    defaultLFO(),
  ] as PresetData['lfos'],
  modRoutes: [
    {
      id: 'pad-mod-1',
      lfoIndex: 0,
      target: { source: 'flt1', param: 'cutoff' },
      depthMin: 0,
      depthMax: 0.3,
      enabled: true,
    },
    {
      id: 'pad-mod-2',
      lfoIndex: 1,
      target: { source: 'osc1', param: 'pan' },
      depthMin: 0.3,
      depthMax: 0.7,
      enabled: true,
    },
  ],
  voiceMode: 'poly',
  voiceCount: 8,
  glide: 0,
  spread: 0.4,
  masterVolume: 0.7,
  fx: {
    ...defaultFX(),
    chorus: { enabled: true, rate: 0.8, depth: 0.4, mix: 0.35 },
  },
  fxRoutes: [
    { id: 'pad-fx-1', type: 'chorus', target: 'master' },
  ] as FXRoute[],
  routing: defaultRouting(),
  arp: defaultArp(),
};

// ─── BASS ──────────────────────────────────────────────
// Deep mono bass: square sub + saw with filter envelope
export const BASS: PresetData = {
  name: 'BASS',
  version: 1,
  oscillators: [
    {
      waveform: 'sawtooth',
      wavetable: 'SAWTOOTH',
      octave: -1,
      semitone: 0,
      fine: 0,
      wtPosition: 0,
      pan: 0,
      level: 0.6,
      unisonVoices: 2,
      unisonDetune: 0.1,
      unisonBlend: 0.3,
      enabled: true,
    },
    {
      waveform: 'square',
      wavetable: 'SQUARE',
      octave: -1,
      semitone: 0,
      fine: 0,
      wtPosition: 0,
      pan: 0,
      level: 0.4,
      unisonVoices: 1,
      unisonDetune: 0,
      unisonBlend: 0.1,
      enabled: true,
    },
  ],
  subOscillator: {
    waveform: 'sine',
    octave: -1,
    semitone: 0,
    fine: 0,
    level: 0.7,
    pan: 0,
    enabled: true,
  },
  noise: { type: 'pink', level: 0.3, pan: 0, enabled: false },
  filters: [
    { type: 'lowpass', cutoff: 800, resonance: 4, pan: 0, gain: 0, mix: 1, enabled: true },
    { type: 'highpass', cutoff: 30, resonance: 0, pan: 0, gain: 0, mix: 1, enabled: true },
  ],
  envelopes: [
    { attack: 0.005, decay: 0.3, sustain: 0.5, release: 0.15 },
    { attack: 0.005, decay: 0.4, sustain: 0.3, release: 0.1 },
  ],
  lfos: [defaultLFO(), defaultLFO(), defaultLFO(), defaultLFO()] as PresetData['lfos'],
  modRoutes: [],
  voiceMode: 'mono',
  voiceCount: 1,
  glide: 0.05,
  spread: 0,
  masterVolume: 0.8,
  fx: {
    ...defaultFX(),
    drive: { enabled: true, amount: 0.25, mix: 0.4 },
    compressor: { enabled: true, threshold: -18, ratio: 6, attack: 0.005, release: 0.15 },
  },
  fxRoutes: [
    { id: 'bass-fx-1', type: 'drive', target: 'master' },
    { id: 'bass-fx-2', type: 'compressor', target: 'master' },
  ] as FXRoute[],
  routing: defaultRouting(),
  arp: defaultArp(),
};

// ─── LEAD ──────────────────────────────────────────────
// Mono lead: bright saw with vibrato LFO
export const LEAD: PresetData = {
  name: 'LEAD',
  version: 1,
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
      unisonVoices: 3,
      unisonDetune: 0.15,
      unisonBlend: 0.4,
      enabled: true,
    },
    {
      waveform: 'square',
      wavetable: 'SQUARE',
      octave: 1,
      semitone: 0,
      fine: 3,
      wtPosition: 0,
      pan: 0.2,
      level: 0.3,
      unisonVoices: 1,
      unisonDetune: 0,
      unisonBlend: 0.1,
      enabled: true,
    },
  ],
  subOscillator: {
    waveform: 'square',
    octave: -1,
    semitone: 0,
    fine: 0,
    level: 0.25,
    pan: 0,
    enabled: true,
  },
  noise: { type: 'pink', level: 0.3, pan: 0, enabled: false },
  filters: [
    { type: 'lowpass', cutoff: 5000, resonance: 3, pan: 0, gain: 0, mix: 1, enabled: true },
    { type: 'lowpass', cutoff: 20000, resonance: 0, pan: 0, gain: 0, mix: 1, enabled: false },
  ],
  envelopes: [
    { attack: 0.01, decay: 0.15, sustain: 0.8, release: 0.2 },
    { attack: 0.01, decay: 0.3, sustain: 0.6, release: 0.3 },
  ],
  lfos: [
    {
      rateDivs: [qr('1/8'), qr('1/8'), qr('1/8'), qr('1/8')] as [QuarterRates, QuarterRates, QuarterRates, QuarterRates],
      rateModifiers: ['normal', 'normal', 'normal', 'normal'] as ['normal', 'normal', 'normal', 'normal'],
      smooths: [0.3, 0.3, 0.3, 0.3] as [number, number, number, number],
      sync: false,
      bars: [sineNodes8(), sineNodes8(), sineNodes8(), sineNodes8()],
    },
    defaultLFO(),
    defaultLFO(),
    defaultLFO(),
  ] as PresetData['lfos'],
  modRoutes: [
    {
      id: 'lead-mod-1',
      lfoIndex: 0,
      target: { source: 'osc1', param: 'detune' },
      depthMin: 0.45,
      depthMax: 0.55,
      enabled: true,
    },
  ],
  voiceMode: 'legato',
  voiceCount: 1,
  glide: 0.08,
  spread: 0,
  masterVolume: 0.75,
  fx: {
    ...defaultFX(),
    delay: { enabled: true, time: 0.375, feedback: 0.35, mix: 0.25 },
    drive: { enabled: true, amount: 0.15, mix: 0.3 },
  },
  fxRoutes: [
    { id: 'lead-fx-1', type: 'drive', target: 'master' },
    { id: 'lead-fx-2', type: 'delay', target: 'master' },
  ] as FXRoute[],
  routing: defaultRouting(),
  arp: { enabled: false, rate: '1/16', style: 'up', distance: 12, step: 2 },
};

// ─── PLUCK ─────────────────────────────────────────────
// Short percussive pluck: fast attack, quick decay, no sustain
export const PLUCK: PresetData = {
  name: 'PLUCK',
  version: 1,
  oscillators: [
    {
      waveform: 'triangle',
      wavetable: 'TRIANGLE',
      octave: 0,
      semitone: 0,
      fine: 0,
      wtPosition: 0,
      pan: -0.1,
      level: 0.7,
      unisonVoices: 2,
      unisonDetune: 0.08,
      unisonBlend: 0.2,
      enabled: true,
    },
    {
      waveform: 'sawtooth',
      wavetable: 'SAWTOOTH',
      octave: 1,
      semitone: 0,
      fine: 5,
      wtPosition: 0,
      pan: 0.1,
      level: 0.3,
      unisonVoices: 1,
      unisonDetune: 0,
      unisonBlend: 0.1,
      enabled: true,
    },
  ],
  subOscillator: {
    waveform: 'sine',
    octave: -1,
    semitone: 0,
    fine: 0,
    level: 0.4,
    pan: 0,
    enabled: false,
  },
  noise: { type: 'white', level: 0.1, pan: 0, enabled: true },
  filters: [
    { type: 'lowpass', cutoff: 6000, resonance: 1.5, pan: 0, gain: 0, mix: 1, enabled: true },
    { type: 'lowpass', cutoff: 20000, resonance: 0, pan: 0, gain: 0, mix: 1, enabled: false },
  ],
  envelopes: [
    { attack: 0.001, decay: 0.25, sustain: 0, release: 0.3 },
    { attack: 0.001, decay: 0.15, sustain: 0, release: 0.2 },
  ],
  lfos: [defaultLFO(), defaultLFO(), defaultLFO(), defaultLFO()] as PresetData['lfos'],
  modRoutes: [],
  voiceMode: 'poly',
  voiceCount: 12,
  glide: 0,
  spread: 0.2,
  masterVolume: 0.8,
  fx: {
    ...defaultFX(),
    delay: { enabled: true, time: 0.25, feedback: 0.4, mix: 0.3 },
    compressor: { enabled: true, threshold: -20, ratio: 3, attack: 0.001, release: 0.1 },
  },
  fxRoutes: [
    { id: 'pluck-fx-1', type: 'delay', target: 'master' },
    { id: 'pluck-fx-2', type: 'compressor', target: 'master' },
  ] as FXRoute[],
  routing: defaultRouting(),
  arp: { enabled: false, rate: '1/8', style: 'up', distance: 12, step: 2 },
};

// ─── WOBBLE ───────────────────────────────────────────
// Dubstep-style wobble bass: aggressive LFO on filter cutoff with curved attack/decay
export const WOBBLE: PresetData = {
  name: 'WOBBLE',
  version: 1,
  oscillators: [
    {
      waveform: 'sawtooth',
      wavetable: 'SAWTOOTH',
      octave: -1,
      semitone: 0,
      fine: 0,
      wtPosition: 0,
      pan: 0,
      level: 0.7,
      unisonVoices: 2,
      unisonDetune: 0.12,
      unisonBlend: 0.3,
      enabled: true,
    },
    {
      waveform: 'square',
      wavetable: 'SQUARE',
      octave: -1,
      semitone: 0,
      fine: 0,
      wtPosition: 0,
      pan: 0,
      level: 0.5,
      unisonVoices: 1,
      unisonDetune: 0,
      unisonBlend: 0.1,
      enabled: true,
    },
  ],
  subOscillator: {
    waveform: 'sine',
    octave: -1,
    semitone: 0,
    fine: 0,
    level: 0.6,
    pan: 0,
    enabled: true,
  },
  noise: { type: 'pink', level: 0.3, pan: 0, enabled: false },
  filters: [
    { type: 'lowpass', cutoff: 600, resonance: 6, pan: 0, gain: 0, mix: 1, enabled: true },
    { type: 'highpass', cutoff: 30, resonance: 0, pan: 0, gain: 0, mix: 1, enabled: true },
  ],
  envelopes: [
    { attack: 0.005, decay: 0.2, sustain: 0.8, release: 0.1 },
    { attack: 0.005, decay: 0.3, sustain: 0.5, release: 0.1 },
  ],
  lfos: [
    {
      rateDivs: [qr('1/4'), qr('1/4'), qr('1/4'), qr('1/4')] as [QuarterRates, QuarterRates, QuarterRates, QuarterRates],
      rateModifiers: ['normal', 'normal', 'normal', 'normal'] as ['normal', 'normal', 'normal', 'normal'],
      smooths: [0.1, 0.1, 0.1, 0.1] as [number, number, number, number],
      sync: false,
      bars: [wobbleNodes4(), wobbleNodes4(), wobbleNodes4(), wobbleNodes4()],
    },
    {
      rateDivs: [qr('1'), qr('1'), qr('1'), qr('1')] as [QuarterRates, QuarterRates, QuarterRates, QuarterRates],
      rateModifiers: ['normal', 'normal', 'normal', 'normal'] as ['normal', 'normal', 'normal', 'normal'],
      smooths: [0.5, 0.5, 0.5, 0.5] as [number, number, number, number],
      sync: false,
      bars: [curvedRamp1(), curvedRamp1(), curvedRamp1(), curvedRamp1()],
    },
    defaultLFO(),
    defaultLFO(),
  ] as PresetData['lfos'],
  modRoutes: [
    {
      id: 'wobble-mod-1',
      lfoIndex: 0,
      target: { source: 'flt1', param: 'cutoff' },
      depthMin: 0,
      depthMax: 0.8,
      enabled: true,
    },
    {
      id: 'wobble-mod-2',
      lfoIndex: 1,
      target: { source: 'flt1', param: 'resonance' },
      depthMin: 0.2,
      depthMax: 0.5,
      enabled: true,
    },
  ],
  voiceMode: 'mono',
  voiceCount: 1,
  glide: 0.03,
  spread: 0,
  masterVolume: 0.75,
  fx: {
    ...defaultFX(),
    drive: { enabled: true, amount: 0.35, mix: 0.5 },
    compressor: { enabled: true, threshold: -16, ratio: 8, attack: 0.003, release: 0.1 },
  },
  fxRoutes: [
    { id: 'wobble-fx-1', type: 'drive', target: 'master' },
    { id: 'wobble-fx-2', type: 'compressor', target: 'master' },
  ] as FXRoute[],
  routing: defaultRouting(),
  arp: defaultArp(),
};

// ─── DRIFT ────────────────────────────────────────────
// Ambient evolving texture: multiple slow LFOs with curves for organic movement
export const DRIFT: PresetData = {
  name: 'DRIFT',
  version: 1,
  oscillators: [
    {
      waveform: 'sawtooth',
      wavetable: 'SAWTOOTH',
      octave: 0,
      semitone: 0,
      fine: -5,
      wtPosition: 0,
      pan: -0.4,
      level: 0.4,
      unisonVoices: 4,
      unisonDetune: 0.35,
      unisonBlend: 0.7,
      enabled: true,
    },
    {
      waveform: 'triangle',
      wavetable: 'TRIANGLE',
      octave: 1,
      semitone: 0,
      fine: 7,
      wtPosition: 0,
      pan: 0.4,
      level: 0.3,
      unisonVoices: 3,
      unisonDetune: 0.2,
      unisonBlend: 0.5,
      enabled: true,
    },
  ],
  subOscillator: {
    waveform: 'sine',
    octave: -1,
    semitone: 0,
    fine: 0,
    level: 0.25,
    pan: 0,
    enabled: true,
  },
  noise: { type: 'pink', level: 0.08, pan: 0, enabled: true },
  filters: [
    { type: 'lowpass', cutoff: 2500, resonance: 3, pan: 0, gain: 0, mix: 1, enabled: true },
    { type: 'highpass', cutoff: 80, resonance: 1, pan: 0, gain: 0, mix: 1, enabled: true },
  ],
  envelopes: [
    { attack: 1.5, decay: 0.8, sustain: 0.7, release: 3.0 },
    { attack: 2.0, decay: 1.0, sustain: 0.5, release: 4.0 },
  ],
  lfos: [
    {
      rateDivs: [qr('1'), qr('1'), qr('1'), qr('1')] as [QuarterRates, QuarterRates, QuarterRates, QuarterRates],
      rateModifiers: ['normal', 'normal', 'normal', 'normal'] as ['normal', 'normal', 'normal', 'normal'],
      smooths: [0.8, 0.8, 0.8, 0.8] as [number, number, number, number],
      sync: false,
      bars: [driftNodes1(), driftNodes1(), driftNodes1(), driftNodes1()],
    },
    {
      rateDivs: [qr('1/2'), qr('1/2'), qr('1/2'), qr('1/2')] as [QuarterRates, QuarterRates, QuarterRates, QuarterRates],
      rateModifiers: ['normal', 'normal', 'normal', 'normal'] as ['normal', 'normal', 'normal', 'normal'],
      smooths: [0.7, 0.7, 0.7, 0.7] as [number, number, number, number],
      sync: false,
      bars: [triangleNodes2(), triangleNodes2(), triangleNodes2(), triangleNodes2()],
    },
    {
      rateDivs: [qr('1'), qr('1'), qr('1'), qr('1')] as [QuarterRates, QuarterRates, QuarterRates, QuarterRates],
      rateModifiers: ['normal', 'normal', 'normal', 'normal'] as ['normal', 'normal', 'normal', 'normal'],
      smooths: [0.9, 0.9, 0.9, 0.9] as [number, number, number, number],
      sync: false,
      bars: [curvedRamp1(), curvedRamp1(), curvedRamp1(), curvedRamp1()],
    },
    defaultLFO(),
  ] as PresetData['lfos'],
  modRoutes: [
    {
      id: 'drift-mod-1',
      lfoIndex: 0,
      target: { source: 'flt1', param: 'cutoff' },
      depthMin: 0.1,
      depthMax: 0.5,
      enabled: true,
    },
    {
      id: 'drift-mod-2',
      lfoIndex: 1,
      target: { source: 'osc1', param: 'pan' },
      depthMin: 0.2,
      depthMax: 0.8,
      enabled: true,
    },
    {
      id: 'drift-mod-3',
      lfoIndex: 2,
      target: { source: 'osc2', param: 'pan' },
      depthMin: 0.8,
      depthMax: 0.2,
      enabled: true,
    },
    {
      id: 'drift-mod-4',
      lfoIndex: 0,
      target: { source: 'flt1', param: 'resonance' },
      depthMin: 0.3,
      depthMax: 0.6,
      enabled: true,
    },
  ],
  voiceMode: 'poly',
  voiceCount: 6,
  glide: 0,
  spread: 0.5,
  masterVolume: 0.65,
  fx: {
    ...defaultFX(),
    delay: { enabled: true, time: 0.5, feedback: 0.45, mix: 0.3 },
    phaser: { enabled: true, rate: 0.3, depth: 0.4, mix: 0.25 },
  },
  fxRoutes: [
    { id: 'drift-fx-1', type: 'phaser', target: 'master' },
    { id: 'drift-fx-2', type: 'delay', target: 'master' },
  ] as FXRoute[],
  routing: defaultRouting(),
  arp: defaultArp(),
};

// ─── TRANCE ───────────────────────────────────────────
// Rhythmic gated pad: LFO gate on filter + level for pumping trance feel
export const TRANCE: PresetData = {
  name: 'TRANCE',
  version: 1,
  oscillators: [
    {
      waveform: 'sawtooth',
      wavetable: 'SAWTOOTH',
      octave: 0,
      semitone: 0,
      fine: -3,
      wtPosition: 0,
      pan: -0.2,
      level: 0.6,
      unisonVoices: 4,
      unisonDetune: 0.2,
      unisonBlend: 0.5,
      enabled: true,
    },
    {
      waveform: 'sawtooth',
      wavetable: 'SAWTOOTH',
      octave: 0,
      semitone: 0,
      fine: 3,
      wtPosition: 0,
      pan: 0.2,
      level: 0.6,
      unisonVoices: 4,
      unisonDetune: 0.2,
      unisonBlend: 0.5,
      enabled: true,
    },
  ],
  subOscillator: {
    waveform: 'sine',
    octave: -1,
    semitone: 0,
    fine: 0,
    level: 0.3,
    pan: 0,
    enabled: true,
  },
  noise: { type: 'pink', level: 0.3, pan: 0, enabled: false },
  filters: [
    { type: 'lowpass', cutoff: 4000, resonance: 4, pan: 0, gain: 0, mix: 1, enabled: true },
    { type: 'lowpass', cutoff: 20000, resonance: 0, pan: 0, gain: 0, mix: 1, enabled: false },
  ],
  envelopes: [
    { attack: 0.01, decay: 0.2, sustain: 0.9, release: 0.4 },
    { attack: 0.01, decay: 0.3, sustain: 0.7, release: 0.5 },
  ],
  lfos: [
    {
      rateDivs: [qr('1/8'), qr('1/8'), qr('1/8'), qr('1/8')] as [QuarterRates, QuarterRates, QuarterRates, QuarterRates],
      rateModifiers: ['normal', 'normal', 'normal', 'normal'] as ['normal', 'normal', 'normal', 'normal'],
      smooths: [0.15, 0.15, 0.15, 0.15] as [number, number, number, number],
      sync: false,
      bars: [gateNodes8(), gateNodes8(), gateNodes8(), gateNodes8()],
    },
    {
      rateDivs: [qr('1/4'), qr('1/4'), qr('1/4'), qr('1/4')] as [QuarterRates, QuarterRates, QuarterRates, QuarterRates],
      rateModifiers: ['normal', 'normal', 'normal', 'normal'] as ['normal', 'normal', 'normal', 'normal'],
      smooths: [0.2, 0.2, 0.2, 0.2] as [number, number, number, number],
      sync: false,
      bars: [triangleNodes4(), triangleNodes4(), triangleNodes4(), triangleNodes4()],
    },
    defaultLFO(),
    defaultLFO(),
  ] as PresetData['lfos'],
  modRoutes: [
    {
      id: 'trance-mod-1',
      lfoIndex: 0,
      target: { source: 'flt1', param: 'cutoff' },
      depthMin: 0.05,
      depthMax: 0.7,
      enabled: true,
    },
    {
      id: 'trance-mod-2',
      lfoIndex: 1,
      target: { source: 'osc1', param: 'level' },
      depthMin: 0.3,
      depthMax: 0.9,
      enabled: true,
    },
    {
      id: 'trance-mod-3',
      lfoIndex: 1,
      target: { source: 'osc2', param: 'level' },
      depthMin: 0.3,
      depthMax: 0.9,
      enabled: true,
    },
  ],
  voiceMode: 'poly',
  voiceCount: 8,
  glide: 0,
  spread: 0.3,
  masterVolume: 0.7,
  fx: {
    ...defaultFX(),
    delay: { enabled: true, time: 0.375, feedback: 0.3, mix: 0.2 },
    compressor: { enabled: true, threshold: -20, ratio: 4, attack: 0.005, release: 0.15 },
  },
  fxRoutes: [
    { id: 'trance-fx-1', type: 'delay', target: 'master' },
    { id: 'trance-fx-2', type: 'compressor', target: 'master' },
  ] as FXRoute[],
  routing: defaultRouting(),
  arp: defaultArp(),
};

// ─── SEQUENCE ─────────────────────────────────────────
// Classic synth sequence: fast 1/16 arp climbing 2 octaves with filter sweep
export const SEQUENCE: PresetData = {
  name: 'SEQUENCE',
  version: 1,
  oscillators: [
    {
      waveform: 'sawtooth',
      wavetable: 'SAWTOOTH',
      octave: 0,
      semitone: 0,
      fine: 0,
      wtPosition: 0,
      pan: -0.15,
      level: 0.6,
      unisonVoices: 2,
      unisonDetune: 0.1,
      unisonBlend: 0.3,
      enabled: true,
    },
    {
      waveform: 'square',
      wavetable: 'SQUARE',
      octave: 0,
      semitone: 0,
      fine: 5,
      wtPosition: 0,
      pan: 0.15,
      level: 0.35,
      unisonVoices: 1,
      unisonDetune: 0,
      unisonBlend: 0.1,
      enabled: true,
    },
  ],
  subOscillator: {
    waveform: 'sine',
    octave: -1,
    semitone: 0,
    fine: 0,
    level: 0.2,
    pan: 0,
    enabled: true,
  },
  noise: { type: 'pink', level: 0.3, pan: 0, enabled: false },
  filters: [
    { type: 'lowpass', cutoff: 3000, resonance: 4, pan: 0, gain: 0, mix: 1, enabled: true },
    { type: 'lowpass', cutoff: 20000, resonance: 0, pan: 0, gain: 0, mix: 1, enabled: false },
  ],
  envelopes: [
    { attack: 0.005, decay: 0.15, sustain: 0.4, release: 0.1 },
    { attack: 0.005, decay: 0.2, sustain: 0.3, release: 0.1 },
  ],
  lfos: [
    {
      rateDivs: [qr('1'), qr('1'), qr('1'), qr('1')] as [QuarterRates, QuarterRates, QuarterRates, QuarterRates],
      rateModifiers: ['normal', 'normal', 'normal', 'normal'] as ['normal', 'normal', 'normal', 'normal'],
      smooths: [0.4, 0.4, 0.4, 0.4] as [number, number, number, number],
      sync: false,
      bars: [curvedRamp1(), curvedRamp1(), curvedRamp1(), curvedRamp1()],
    },
    defaultLFO(),
    defaultLFO(),
    defaultLFO(),
  ] as PresetData['lfos'],
  modRoutes: [
    {
      id: 'seq-mod-1',
      lfoIndex: 0,
      target: { source: 'flt1', param: 'cutoff' },
      depthMin: 0.1,
      depthMax: 0.5,
      enabled: true,
    },
  ],
  voiceMode: 'poly',
  voiceCount: 8,
  glide: 0,
  spread: 0.2,
  masterVolume: 0.7,
  fx: {
    ...defaultFX(),
    delay: { enabled: true, time: 0.188, feedback: 0.35, mix: 0.25 },
    compressor: { enabled: true, threshold: -18, ratio: 4, attack: 0.003, release: 0.1 },
  },
  fxRoutes: [
    { id: 'seq-fx-1', type: 'delay', target: 'master' },
    { id: 'seq-fx-2', type: 'compressor', target: 'master' },
  ] as FXRoute[],
  routing: defaultRouting(),
  arp: { enabled: true, rate: '1/16', style: 'up', distance: 12, step: 2 },
};

// ─── CHORDS ───────────────────────────────────────────
// Rolling arpeggiated chords: upDown style with warm pad sound
export const CHORDS: PresetData = {
  name: 'CHORDS',
  version: 1,
  oscillators: [
    {
      waveform: 'sawtooth',
      wavetable: 'SAWTOOTH',
      octave: 0,
      semitone: 0,
      fine: -6,
      wtPosition: 0,
      pan: -0.25,
      level: 0.5,
      unisonVoices: 3,
      unisonDetune: 0.18,
      unisonBlend: 0.5,
      enabled: true,
    },
    {
      waveform: 'triangle',
      wavetable: 'TRIANGLE',
      octave: 1,
      semitone: 0,
      fine: 6,
      wtPosition: 0,
      pan: 0.25,
      level: 0.3,
      unisonVoices: 2,
      unisonDetune: 0.1,
      unisonBlend: 0.3,
      enabled: true,
    },
  ],
  subOscillator: {
    waveform: 'sine',
    octave: -1,
    semitone: 0,
    fine: 0,
    level: 0.15,
    pan: 0,
    enabled: true,
  },
  noise: { type: 'pink', level: 0.3, pan: 0, enabled: false },
  filters: [
    { type: 'lowpass', cutoff: 4500, resonance: 2, pan: 0, gain: 0, mix: 1, enabled: true },
    { type: 'lowpass', cutoff: 20000, resonance: 0, pan: 0, gain: 0, mix: 1, enabled: false },
  ],
  envelopes: [
    { attack: 0.01, decay: 0.3, sustain: 0.6, release: 0.5 },
    { attack: 0.01, decay: 0.4, sustain: 0.5, release: 0.6 },
  ],
  lfos: [
    {
      rateDivs: [qr('1'), qr('1'), qr('1'), qr('1')] as [QuarterRates, QuarterRates, QuarterRates, QuarterRates],
      rateModifiers: ['normal', 'normal', 'normal', 'normal'] as ['normal', 'normal', 'normal', 'normal'],
      smooths: [0.5, 0.5, 0.5, 0.5] as [number, number, number, number],
      sync: false,
      bars: [driftNodes1(), driftNodes1(), driftNodes1(), driftNodes1()],
    },
    defaultLFO(),
    defaultLFO(),
    defaultLFO(),
  ] as PresetData['lfos'],
  modRoutes: [
    {
      id: 'chords-mod-1',
      lfoIndex: 0,
      target: { source: 'flt1', param: 'cutoff' },
      depthMin: 0.15,
      depthMax: 0.4,
      enabled: true,
    },
  ],
  voiceMode: 'poly',
  voiceCount: 8,
  glide: 0,
  spread: 0.3,
  masterVolume: 0.7,
  fx: {
    ...defaultFX(),
    chorus: { enabled: true, rate: 0.6, depth: 0.3, mix: 0.25 },
    delay: { enabled: true, time: 0.375, feedback: 0.4, mix: 0.25 },
  },
  fxRoutes: [
    { id: 'chords-fx-1', type: 'chorus', target: 'master' },
    { id: 'chords-fx-2', type: 'delay', target: 'master' },
  ] as FXRoute[],
  routing: defaultRouting(),
  arp: { enabled: true, rate: '1/8', style: 'upDown', distance: 12, step: 2 },
};

// ─── STAB ─────────────────────────────────────────────
// Rhythmic triplet stabs: short percussive arp with drive
export const STAB: PresetData = {
  name: 'STAB',
  version: 1,
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
      unisonVoices: 4,
      unisonDetune: 0.15,
      unisonBlend: 0.4,
      enabled: true,
    },
    {
      waveform: 'sawtooth',
      wavetable: 'SAWTOOTH',
      octave: 1,
      semitone: 0,
      fine: 0,
      wtPosition: 0,
      pan: 0,
      level: 0.25,
      unisonVoices: 1,
      unisonDetune: 0,
      unisonBlend: 0.1,
      enabled: true,
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
  noise: { type: 'white', level: 0.05, pan: 0, enabled: true },
  filters: [
    { type: 'lowpass', cutoff: 5500, resonance: 3, pan: 0, gain: 0, mix: 1, enabled: true },
    { type: 'lowpass', cutoff: 20000, resonance: 0, pan: 0, gain: 0, mix: 1, enabled: false },
  ],
  envelopes: [
    { attack: 0.001, decay: 0.08, sustain: 0.1, release: 0.05 },
    { attack: 0.001, decay: 0.06, sustain: 0, release: 0.05 },
  ],
  lfos: [defaultLFO(), defaultLFO(), defaultLFO(), defaultLFO()] as PresetData['lfos'],
  modRoutes: [],
  voiceMode: 'poly',
  voiceCount: 8,
  glide: 0,
  spread: 0.15,
  masterVolume: 0.75,
  fx: {
    ...defaultFX(),
    drive: { enabled: true, amount: 0.2, mix: 0.35 },
    delay: { enabled: true, time: 0.25, feedback: 0.3, mix: 0.2 },
  },
  fxRoutes: [
    { id: 'stab-fx-1', type: 'drive', target: 'master' },
    { id: 'stab-fx-2', type: 'delay', target: 'master' },
  ] as FXRoute[],
  routing: defaultRouting(),
  arp: { enabled: true, rate: '1/8t', style: 'up', distance: 12, step: 1 },
};

export const FACTORY_PRESETS: PresetData[] = [
  INITIALIZE,
  PAD,
  BASS,
  LEAD,
  PLUCK,
  WOBBLE,
  DRIFT,
  TRANCE,
  SEQUENCE,
  CHORDS,
  STAB,
];
