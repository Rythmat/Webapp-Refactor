/**
 * Wavetable synthesizer engine — Oracle-inspired.
 * Renders synth presets + MIDI notes to AudioBuffer via OfflineAudioContext.
 */

import type { MidiNote } from './midi-engine';

// === Waveform & Filter Types ===

export type OscWaveform = 'sine' | 'sawtooth' | 'square' | 'triangle';
export type NoiseType = 'white' | 'pink' | 'off';
export type FilterSlope = 12 | 24;
export type LfoShape = 'sine' | 'triangle' | 'sawtooth' | 'square';

export type ModSource =
  | 'lfo1' | 'lfo2' | 'lfo3' | 'lfo4'
  | 'env1' | 'env2'
  | 'velocity' | 'note';

export type ModTarget =
  | 'osc1Pitch' | 'osc2Pitch' | 'subPitch'
  | 'osc1Level' | 'osc2Level' | 'subLevel' | 'noiseLevel'
  | 'filter1Cutoff' | 'filter2Cutoff'
  | 'filter1Resonance' | 'filter2Resonance'
  | 'ampLevel' | 'pan'
  | 'lfo1Rate' | 'lfo2Rate';

// === Sub-component interfaces ===

export interface SubOscConfig {
  enabled: boolean;
  waveform: OscWaveform;
  octave: number;   // -2 to +2
  level: number;    // 0-1
}

export interface OscConfig {
  enabled: boolean;
  waveform: OscWaveform;
  wtPosition: number;  // 0-1 (0 = sine, 1 = target waveform)
  octave: number;      // -2 to +2
  semitone: number;    // -12 to +12
  fine: number;        // -100 to +100 cents
  level: number;       // 0-1
}

export interface NoiseConfig {
  type: NoiseType;
  level: number;  // 0-1
}

export interface FilterConfig {
  enabled: boolean;
  type: BiquadFilterType;
  slope: FilterSlope;
  cutoff: number;      // 20-20000 Hz
  resonance: number;   // 0-30
  keyTracking: number; // 0-1
  envelopeAmount: number; // -1 to 1
}

export interface EnvelopeConfig {
  attack: number;   // 0-10 seconds
  decay: number;    // 0-10 seconds
  sustain: number;  // 0-1
  release: number;  // 0-10 seconds
}

export interface LfoConfig {
  enabled: boolean;
  shape: LfoShape;
  rate: number;    // 0.01-50 Hz
  depth: number;   // 0-1
}

export interface ModSlot {
  source: ModSource;
  target: ModTarget;
  amount: number;  // -1 to 1
}

export interface UnisonConfig {
  voices: number;   // 1-16
  detune: number;   // 0-100 cents
  blend: number;    // 0-1 (stereo spread)
}

// === Main Preset ===

export interface SynthPreset {
  name: string;
  category: string;
  sub: SubOscConfig;
  osc1: OscConfig;
  osc2: OscConfig;
  noise: NoiseConfig;
  filter1: FilterConfig;
  filter2: FilterConfig;
  ampEnvelope: EnvelopeConfig;
  filterEnvelope: EnvelopeConfig;
  lfo1: LfoConfig;
  lfo2: LfoConfig;
  lfo3: LfoConfig;
  lfo4: LfoConfig;
  modMatrix: ModSlot[];
  unison: UnisonConfig;
  masterGain: number;  // 0-1
  glide: number;       // 0-2 seconds
}

/** Clip data for synth tracks (stored alongside rendered buffer) */
export interface SynthClipData {
  notes: MidiNote[];
  preset: SynthPreset;
  totalDuration: number;
}

// === Default Init Patch ===

export const DEFAULT_SYNTH_PRESET: SynthPreset = {
  name: 'Init',
  category: 'Init',
  sub: { enabled: false, waveform: 'sine', octave: -1, level: 0.5 },
  osc1: { enabled: true, waveform: 'sawtooth', wtPosition: 0.5, octave: 0, semitone: 0, fine: 0, level: 0.7 },
  osc2: { enabled: false, waveform: 'square', wtPosition: 0.5, octave: 0, semitone: 0, fine: 0, level: 0.5 },
  noise: { type: 'off', level: 0.1 },
  filter1: { enabled: true, type: 'lowpass', slope: 24, cutoff: 4000, resonance: 1.0, keyTracking: 0.5, envelopeAmount: 0.3 },
  filter2: { enabled: false, type: 'highpass', slope: 12, cutoff: 100, resonance: 0.5, keyTracking: 0, envelopeAmount: 0 },
  ampEnvelope: { attack: 0.01, decay: 0.3, sustain: 0.7, release: 0.3 },
  filterEnvelope: { attack: 0.05, decay: 0.4, sustain: 0.4, release: 0.5 },
  lfo1: { enabled: false, shape: 'sine', rate: 2.0, depth: 0.3 },
  lfo2: { enabled: false, shape: 'triangle', rate: 0.5, depth: 0.5 },
  lfo3: { enabled: false, shape: 'sine', rate: 1.0, depth: 0.3 },
  lfo4: { enabled: false, shape: 'sine', rate: 4.0, depth: 0.2 },
  modMatrix: [],
  unison: { voices: 1, detune: 15, blend: 0.5 },
  masterGain: 0.7,
  glide: 0,
};

// === Helpers ===

/** MIDI note number to frequency in Hz */
function midiToFreq(note: number): number {
  return 440 * Math.pow(2, (note - 69) / 12);
}

/** Create a white noise AudioBuffer (1 second, loopable) */
function createNoiseBuffer(ctx: OfflineAudioContext, type: NoiseType): AudioBuffer {
  const length = ctx.sampleRate;
  const buf = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buf.getChannelData(0);

  if (type === 'white') {
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
  } else if (type === 'pink') {
    // Paul Kellet's pink noise algorithm
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }
  }
  return buf;
}

/** Schedule ADSR automation on an AudioParam */
function scheduleADSR(
  param: AudioParam,
  env: EnvelopeConfig,
  noteOnTime: number,
  noteOffTime: number,
  peakValue: number,
  baseValue: number = 0,
) {
  const { attack, decay, sustain, release } = env;
  const sustainValue = baseValue + (peakValue - baseValue) * sustain;

  // At note-on: start from base
  param.setValueAtTime(baseValue, noteOnTime);

  // Attack: ramp to peak
  const attackEnd = noteOnTime + Math.max(attack, 0.001);
  param.linearRampToValueAtTime(peakValue, attackEnd);

  // Decay: ramp to sustain level
  const decayEnd = attackEnd + Math.max(decay, 0.001);
  param.linearRampToValueAtTime(sustainValue, decayEnd);

  // Sustain: hold until note-off
  // (param stays at sustain level naturally)

  // Release: ramp to base at note-off
  param.setValueAtTime(sustainValue, noteOffTime);
  param.linearRampToValueAtTime(baseValue, noteOffTime + Math.max(release, 0.001));
}

/** Create oscillator with wavetable position (crossfade between sine and target waveform) */
function createWTOscillator(
  ctx: OfflineAudioContext,
  config: OscConfig,
  freq: number,
  output: AudioNode,
  noteOnTime: number,
  noteOffTime: number,
  maxRelease: number,
): AudioNode[] {
  const nodes: AudioNode[] = [];
  const endTime = noteOffTime + maxRelease + 0.05;

  // Sine component (1 - wtPosition)
  const sineOsc = ctx.createOscillator();
  sineOsc.type = 'sine';
  sineOsc.frequency.value = freq;
  const sineGain = ctx.createGain();
  sineGain.gain.value = config.level * (1 - config.wtPosition);
  sineOsc.connect(sineGain);
  sineGain.connect(output);
  sineOsc.start(noteOnTime);
  sineOsc.stop(endTime);
  nodes.push(sineOsc, sineGain);

  // Target waveform component (wtPosition)
  if (config.wtPosition > 0.001) {
    const targetOsc = ctx.createOscillator();
    targetOsc.type = config.waveform;
    targetOsc.frequency.value = freq;
    const targetGain = ctx.createGain();
    targetGain.gain.value = config.level * config.wtPosition;
    targetOsc.connect(targetGain);
    targetGain.connect(output);
    targetOsc.start(noteOnTime);
    targetOsc.stop(endTime);
    nodes.push(targetOsc, targetGain);
  }

  return nodes;
}

/** Build a filter (12dB or 24dB) */
function createFilter(
  ctx: OfflineAudioContext,
  config: FilterConfig,
  noteFreq: number,
): { input: AudioNode; output: AudioNode; filterNodes: BiquadFilterNode[] } {
  // Key tracking: shift cutoff based on note frequency relative to middle C
  const ktShift = config.keyTracking * (noteFreq / 261.63);
  const cutoff = Math.min(20000, Math.max(20, config.cutoff * (config.keyTracking > 0 ? ktShift : 1)));

  const filter1 = ctx.createBiquadFilter();
  filter1.type = config.type;
  filter1.frequency.value = cutoff;
  filter1.Q.value = config.resonance;

  if (config.slope === 24) {
    // Two cascaded 12dB filters for 24dB/oct
    const filter2 = ctx.createBiquadFilter();
    filter2.type = config.type;
    filter2.frequency.value = cutoff;
    filter2.Q.value = config.resonance * 0.7; // slightly less Q on second stage
    filter1.connect(filter2);
    return { input: filter1, output: filter2, filterNodes: [filter1, filter2] };
  }

  return { input: filter1, output: filter1, filterNodes: [filter1] };
}

// === Main Render Function ===

/**
 * Render a synth preset + notes to an AudioBuffer using OfflineAudioContext.
 * Follows the same pattern as renderMidiToAudioBuffer in midi-engine.ts.
 */
export async function renderSynthToAudioBuffer(
  preset: SynthPreset,
  notes: MidiNote[],
  totalDuration: number,
  sampleRate: number = 44100,
): Promise<AudioBuffer> {
  if (notes.length === 0) {
    // Return a silent buffer
    const ctx = new OfflineAudioContext(2, Math.ceil(totalDuration * sampleRate), sampleRate);
    return ctx.startRendering();
  }

  const maxRelease = Math.max(preset.ampEnvelope.release, preset.filterEnvelope.release);
  const renderDuration = totalDuration + maxRelease + 0.1;
  const ctx = new OfflineAudioContext(2, Math.ceil(renderDuration * sampleRate), sampleRate);

  // Master output gain
  const masterGain = ctx.createGain();
  masterGain.gain.value = preset.masterGain;
  masterGain.connect(ctx.destination);

  // Noise buffer (pre-generated if needed)
  let noiseBuffer: AudioBuffer | null = null;
  if (preset.noise.type !== 'off' && preset.noise.level > 0) {
    noiseBuffer = createNoiseBuffer(ctx, preset.noise.type);
  }

  // Render each note
  for (const note of notes) {
    const baseFreq = midiToFreq(note.note);
    const velocity = note.velocity / 127;
    const noteOnTime = note.startTime;
    const noteOffTime = noteOnTime + note.duration;
    const endTime = noteOffTime + maxRelease + 0.05;

    // Per-note voice gain (amp envelope applied here)
    const voiceGain = ctx.createGain();
    voiceGain.gain.value = 0;
    scheduleADSR(voiceGain.gain, preset.ampEnvelope, noteOnTime, noteOffTime, velocity, 0);

    // Filter chain
    let signalInput: AudioNode = voiceGain;
    const filterNodes: BiquadFilterNode[] = [];

    if (preset.filter1.enabled) {
      const f1 = createFilter(ctx, preset.filter1, baseFreq);
      voiceGain.connect(f1.input);
      signalInput = f1.output;
      filterNodes.push(...f1.filterNodes);

      // Filter envelope modulation
      if (Math.abs(preset.filter1.envelopeAmount) > 0.01) {
        for (const fNode of f1.filterNodes) {
          const envAmount = preset.filter1.envelopeAmount * 8000;
          const baseCutoff = fNode.frequency.value;
          scheduleADSR(
            fNode.frequency,
            preset.filterEnvelope,
            noteOnTime,
            noteOffTime,
            baseCutoff + envAmount,
            baseCutoff,
          );
        }
      }
    }

    if (preset.filter2.enabled) {
      const f2 = createFilter(ctx, preset.filter2, baseFreq);
      signalInput.connect(f2.input);
      signalInput = f2.output;
      filterNodes.push(...f2.filterNodes);

      if (Math.abs(preset.filter2.envelopeAmount) > 0.01) {
        for (const fNode of f2.filterNodes) {
          const envAmount = preset.filter2.envelopeAmount * 8000;
          const baseCutoff = fNode.frequency.value;
          scheduleADSR(
            fNode.frequency,
            preset.filterEnvelope,
            noteOnTime,
            noteOffTime,
            baseCutoff + envAmount,
            baseCutoff,
          );
        }
      }
    }

    if (!preset.filter1.enabled) {
      // No filter1 — connect voice gain directly to next stage
      signalInput = voiceGain;
    }

    signalInput.connect(masterGain);

    // Unison rendering
    const unisonVoices = Math.max(1, Math.min(16, preset.unison.voices));

    for (let uv = 0; uv < unisonVoices; uv++) {
      // Calculate per-voice detuning and panning
      let detuneOffset = 0;
      let panValue = 0;

      if (unisonVoices > 1) {
        const spread = (uv / (unisonVoices - 1)) * 2 - 1; // -1 to 1
        detuneOffset = spread * preset.unison.detune;
        panValue = spread * preset.unison.blend;
      }

      // Per-unison-voice pan
      const panNode = ctx.createStereoPanner();
      panNode.pan.value = panValue;
      panNode.connect(preset.filter1.enabled ? filterNodes[0] : voiceGain);

      const unisonGain = ctx.createGain();
      unisonGain.gain.value = 1 / Math.sqrt(unisonVoices); // normalize
      unisonGain.connect(panNode);

      // Sub oscillator
      if (preset.sub.enabled) {
        const subFreq = baseFreq * Math.pow(2, preset.sub.octave);
        const subOsc = ctx.createOscillator();
        subOsc.type = preset.sub.waveform;
        subOsc.frequency.value = subFreq;
        subOsc.detune.value = detuneOffset * 0.5; // less detune on sub

        const subGain = ctx.createGain();
        subGain.gain.value = preset.sub.level;
        subOsc.connect(subGain);
        subGain.connect(unisonGain);
        subOsc.start(noteOnTime);
        subOsc.stop(endTime);
      }

      // OSC 1
      if (preset.osc1.enabled) {
        const osc1Freq = baseFreq
          * Math.pow(2, preset.osc1.octave)
          * Math.pow(2, preset.osc1.semitone / 12)
          * Math.pow(2, (preset.osc1.fine + detuneOffset) / 1200);

        createWTOscillator(ctx, preset.osc1, osc1Freq, unisonGain, noteOnTime, noteOffTime, maxRelease);
      }

      // OSC 2
      if (preset.osc2.enabled) {
        const osc2Freq = baseFreq
          * Math.pow(2, preset.osc2.octave)
          * Math.pow(2, preset.osc2.semitone / 12)
          * Math.pow(2, (preset.osc2.fine + detuneOffset) / 1200);

        createWTOscillator(ctx, preset.osc2, osc2Freq, unisonGain, noteOnTime, noteOffTime, maxRelease);
      }

      // Noise
      if (noiseBuffer && preset.noise.type !== 'off') {
        const noiseSrc = ctx.createBufferSource();
        noiseSrc.buffer = noiseBuffer;
        noiseSrc.loop = true;
        const noiseGain = ctx.createGain();
        noiseGain.gain.value = preset.noise.level;
        noiseSrc.connect(noiseGain);
        noiseGain.connect(unisonGain);
        noiseSrc.start(noteOnTime);
        noiseSrc.stop(endTime);
      }
    }

    // LFO modulation (apply LFOs that have targets in modMatrix)
    const lfoConfigs = [preset.lfo1, preset.lfo2, preset.lfo3, preset.lfo4];
    const lfoNames: ModSource[] = ['lfo1', 'lfo2', 'lfo3', 'lfo4'];

    for (let li = 0; li < 4; li++) {
      const lfo = lfoConfigs[li];
      if (!lfo.enabled) continue;

      // Find mod slots for this LFO
      const slots = preset.modMatrix.filter(s => s.source === lfoNames[li]);
      if (slots.length === 0) continue;

      const lfoOsc = ctx.createOscillator();
      lfoOsc.type = lfo.shape;
      lfoOsc.frequency.value = lfo.rate;
      lfoOsc.start(noteOnTime);
      lfoOsc.stop(endTime);

      for (const slot of slots) {
        const lfoGain = ctx.createGain();
        lfoGain.gain.value = lfo.depth * slot.amount;
        lfoOsc.connect(lfoGain);

        // Connect to target parameter
        if (slot.target === 'filter1Cutoff' && filterNodes.length > 0) {
          lfoGain.gain.value *= 2000; // scale for frequency
          lfoGain.connect(filterNodes[0].frequency);
        } else if (slot.target === 'filter2Cutoff' && filterNodes.length > 1) {
          lfoGain.gain.value *= 2000;
          lfoGain.connect(filterNodes[filterNodes.length - 1].frequency);
        } else if (slot.target === 'ampLevel') {
          lfoGain.gain.value *= 0.3;
          lfoGain.connect(voiceGain.gain);
        }
      }
    }
  }

  return ctx.startRendering();
}
