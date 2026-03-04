export type BasicWaveform = 'sine' | 'triangle' | 'sawtooth' | 'square';

export type FilterType =
  | 'lowpass'
  | 'highpass'
  | 'bandpass'
  | 'notch'
  | 'allpass'
  | 'peaking'
  | 'lowshelf'
  | 'highshelf';

export type VoiceMode = 'poly' | 'legato' | 'mono';

export type VoiceState = 'free' | 'active' | 'releasing';

export interface LFONode {
  time: number;    // 0..1 normalized position within one bar
  value: number;   // 0..1 unipolar
  curve?: number;  // -1..1, default 0 (linear). Controls shape to next node.
}

export interface ModTarget {
  source: 'sub' | 'osc1' | 'osc2' | 'noise' | 'flt1' | 'flt2';
  param:
    | 'mix'
    | 'pan'
    | 'detune'
    | 'blend'
    | 'cutoff'
    | 'resonance'
    | 'level'
    | 'wtPos'
    | 'gain';
}

export interface ModRoute {
  id: string;
  lfoIndex: number; // 0-3
  target: ModTarget;
  depthMin: number; // 0..1
  depthMax: number; // 0..1
  enabled: boolean;
}

export interface NoteEvent {
  type: 'noteOn' | 'noteOff';
  note: number; // MIDI 0-127
  velocity: number; // 0-1
}

export interface OscillatorParams {
  waveform: BasicWaveform;
  wavetable: string;
  octave: number; // -3..+3
  semitone: number; // -12..+12
  fine: number; // -100..+100 cents
  wtPosition: number; // 0..1
  pan: number; // -1..+1
  level: number; // 0..1
  unisonVoices: number; // 1..16
  unisonDetune: number; // 0..1 → mapped to cents
  unisonBlend: number; // 0..1
  enabled: boolean;
}

export interface SubOscillatorParams {
  waveform: BasicWaveform;
  octave: number; // -2..-1 relative
  semitone: number;
  fine: number;
  level: number;
  pan: number;
  enabled: boolean;
}

export interface NoiseParams {
  type: 'white' | 'pink';
  level: number;
  pan: number;
  enabled: boolean;
}

export interface FilterParams {
  type: FilterType;
  cutoff: number; // 20..20000 Hz
  resonance: number; // 0..30
  pan: number;
  gain: number; // -24..+24 dB
  mix: number; // 0..1
  enabled: boolean;
}

export interface EnvelopeParams {
  attack: number; // seconds
  decay: number;
  sustain: number; // 0..1
  release: number;
}

export type RateDiv =
  | '4'     // 4 bars
  | '2'     // 2 bars
  | '1'     // 1 bar
  | '1/2d'  // dotted half
  | '1/2'   // half note
  | '1/2t'  // half triplet
  | '1/4d'  // dotted quarter
  | '1/4'   // quarter note
  | '1/4t'  // quarter triplet
  | '1/8d'  // dotted eighth
  | '1/8'   // eighth note
  | '1/8t'  // eighth triplet
  | '1/16d' // dotted sixteenth
  | '1/16'  // sixteenth note
  | '1/16t' // sixteenth triplet
  | '1/32'  // thirty-second note
  | '1/32t' // thirty-second triplet
  | '1/64'; // sixty-fourth note

export type QuarterRates = [RateDiv, RateDiv, RateDiv, RateDiv];
export type RateModifier = 'normal' | 'triplet' | 'dotted';

export interface LFOParams {
  rateDivs: [QuarterRates, QuarterRates, QuarterRates, QuarterRates];
  rateModifiers: [RateModifier, RateModifier, RateModifier, RateModifier];
  smooths: [number, number, number, number]; // 0..1 per bar (0=triangle, 1=sine)
  sync: boolean;
  bars: [LFONode[], LFONode[], LFONode[], LFONode[]];
}

// --- FX ---

export interface ChorusParams {
  enabled: boolean;
  rate: number;   // 0.1..10 Hz
  depth: number;  // 0..1
  mix: number;    // 0..1
}

export interface DelayParams {
  enabled: boolean;
  time: number;     // 0.01..2 seconds
  feedback: number; // 0..0.95
  mix: number;      // 0..1
}

export interface PhaserParams {
  enabled: boolean;
  rate: number;   // 0.1..10 Hz
  depth: number;  // 0..1
  mix: number;    // 0..1
}

export interface CompressorParams {
  enabled: boolean;
  threshold: number; // -60..0 dB
  ratio: number;     // 1..20
  attack: number;    // 0..1 seconds
  release: number;   // 0..1 seconds
}

export interface DriveParams {
  enabled: boolean;
  amount: number; // 0..1
  mix: number;    // 0..1
}

export interface FXParams {
  chorus: ChorusParams;
  delay: DelayParams;
  phaser: PhaserParams;
  compressor: CompressorParams;
  drive: DriveParams;
}

export type FXType = 'drive' | 'chorus' | 'phaser' | 'delay' | 'compressor';

export interface FXRoute {
  id: string;
  type: FXType;
  target: string;
}

// --- Routing ---

export type SourceId = 'osc1' | 'osc2' | 'sub' | 'noise';

export interface RoutingConfig {
  filterRouting: {
    filter1Sources: SourceId[];
    filter2Sources: SourceId[];
  };
  envelopeRouting: {
    env1Sources: SourceId[];
    env2Sources: SourceId[];
  };
}

// --- Arpeggiator ---

export type ArpStyle = 'up' | 'down' | 'upDown' | 'downUp';

export interface ArpParams {
  enabled: boolean;
  rate: RateDiv;
  style: ArpStyle;
  distance: number;    // semitones: 12, 24, -12, -24
  step: number;        // semitone interval: 1, 2, 3
}
