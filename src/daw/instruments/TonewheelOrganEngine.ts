import type { InstrumentAdapter } from './InstrumentAdapter';

// ── Constants ────────────────────────────────────────────────────────────

const MAX_VOICES = 12;

/**
 * Harmonic ratios for the 9 drawbar footages relative to the played note.
 */
const HARMONIC_RATIOS: readonly number[] = [
  0.5,  // 16'  sub-octave
  1.5,  // 5⅓' fifth above sub
  1,    // 8'   fundamental
  2,    // 4'   octave
  3,    // 2⅔' octave + fifth
  4,    // 2'   two octaves
  5,    // 1⅗' two octaves + major third
  6,    // 1⅓' two octaves + fifth
  8,    // 1'   three octaves
];

export const DRAWBAR_LABELS: readonly string[] = [
  "16'", "5⅓'", "8'", "4'", "2⅔'", "2'", "1⅗'", "1⅓'", "1'",
];

/** Hammond-style drawbar taper: position 0–8 → amplitude 0.0–1.0. */
const DRAWBAR_TAPER: readonly number[] = [
  0, 0.05, 0.10, 0.18, 0.28, 0.40, 0.55, 0.75, 1.0,
];

function midiToFreq(note: number): number {
  return 440 * Math.pow(2, (note - 69) / 12);
}

// ── Tonewheel imperfections ─────────────────────────────────────────────
// Pre-computed per-wheel detuning (±2 cents random) for realism.
// 128 MIDI notes × 9 drawbars = one detuning factor per wheel.
const WHEEL_DETUNE: Float32Array = (() => {
  const arr = new Float32Array(128 * 9);
  // Deterministic pseudo-random (no dependency on Math.random seed)
  let seed = 0xDEADBEEF;
  for (let i = 0; i < arr.length; i++) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const cents = ((seed / 0xFFFFFFFF) * 4 - 2); // ±2 cents
    arr[i] = Math.pow(2, cents / 1200);
  }
  return arr;
})();

// ── Presets ─────────────────────────────────────────────────────────────

export interface OrganPreset {
  name: string;
  drawbars: number[];
}

export const ORGAN_PRESETS: readonly OrganPreset[] = [
  // ── Popular / Genre ──
  { name: 'Gospel',      drawbars: [8, 8, 8, 0, 0, 0, 0, 0, 0] },
  { name: 'Jazz',        drawbars: [8, 8, 8, 0, 0, 0, 0, 0, 0] },
  { name: 'Blues',       drawbars: [8, 8, 6, 4, 3, 2, 0, 0, 0] },
  { name: 'Rock',        drawbars: [6, 8, 8, 6, 0, 0, 0, 0, 0] },
  { name: 'Funk',        drawbars: [8, 8, 8, 6, 5, 3, 0, 0, 0] },
  { name: 'Reggae',      drawbars: [0, 0, 8, 8, 0, 8, 0, 0, 0] },
  { name: 'Soul',        drawbars: [8, 5, 8, 3, 2, 4, 5, 4, 4] },
  { name: 'Ballad',      drawbars: [6, 8, 8, 6, 0, 0, 0, 0, 0] },
  // ── Classic Organ Tones ──
  { name: 'Full Organ',  drawbars: [8, 6, 8, 8, 7, 5, 6, 4, 8] },
  { name: 'Cathedral',   drawbars: [0, 0, 8, 8, 8, 8, 8, 8, 8] },
  { name: 'Tibia',       drawbars: [0, 0, 8, 2, 4, 0, 0, 0, 0] },
  { name: 'Trumpet',     drawbars: [0, 0, 6, 8, 6, 7, 5, 3, 1] },
  { name: 'Clarinet',    drawbars: [0, 0, 8, 3, 8, 2, 7, 0, 0] },
  { name: 'Oboe',        drawbars: [0, 0, 4, 6, 7, 5, 3, 0, 0] },
  { name: 'Flutes',      drawbars: [0, 0, 5, 4, 0, 3, 0, 0, 0] },
  { name: 'Whistle',     drawbars: [0, 0, 0, 0, 0, 8, 7, 8, 8] },
];

// ── Types ────────────────────────────────────────────────────────────────

export type PercHarmonic = '2nd' | '3rd';
export type PercVolume = 'normal' | 'soft';
export type PercDecay = 'fast' | 'slow';
export type VibratoMode = 'off' | 'V1' | 'V2' | 'V3' | 'C1' | 'C2' | 'C3';
export type LeslieSpeed = 'stop' | 'slow' | 'fast';

export interface OrganState {
  drawbars: number[];
  clickLevel: number;
  percEnabled: boolean;
  percHarmonic: PercHarmonic;
  percVolume: PercVolume;
  percDecay: PercDecay;
  vibratoMode: VibratoMode;
  overdrive: number;
  leslieSpeed: LeslieSpeed;
  leslieEnabled: boolean;
  swellLevel: number;
}

// ── Voice ────────────────────────────────────────────────────────────────

interface Voice {
  note: number;
  oscillators: OscillatorNode[];
  drawbarGains: GainNode[];
  percOsc: OscillatorNode | null;
  percGain: GainNode | null;
  mixer: GainNode;
  age: number;
}

// ── Vibrato depth config ─────────────────────────────────────────────────

const VIBRATO_DEPTH: Record<string, number> = {
  V1: 0.000068, V2: 0.000136, V3: 0.000204,  // setBfree: ±3/6/9 samples @ 44.1kHz
  C1: 0.000068, C2: 0.000136, C3: 0.000204,
};
const VIBRATO_RATE = 7.25; // Hz — setBfree scanner speed

// ── Leslie config ────────────────────────────────────────────────────────

const LESLIE_HORN_SLOW = 0.672;   // setBfree: 40.32 RPM
const LESLIE_HORN_FAST = 7.056;   // setBfree: 423.36 RPM
const LESLIE_DRUM_SLOW = 0.6;     // setBfree: 36.0 RPM
const LESLIE_DRUM_FAST = 5.955;   // setBfree: 357.3 RPM
const LESLIE_HORN_ACCEL = 0.161;  // setBfree: fast spin-up
const LESLIE_HORN_DECEL = 0.321;  // setBfree: slower spin-down
const LESLIE_DRUM_ACCEL = 4.127;  // setBfree: heavy drum momentum
const LESLIE_DRUM_DECEL = 1.371;  // setBfree: moderate spin-down
const LESLIE_CROSSOVER = 800; // Hz

// ── TonewheelOrganEngine ─────────────────────────────────────────────────

export class TonewheelOrganEngine implements InstrumentAdapter {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private tonewheelWave: PeriodicWave | null = null; // tonewheel harmonic content

  // Signal chain nodes (created in init)
  private voiceBus: GainNode | null = null;       // all voices sum here
  private clickBus: GainNode | null = null;        // key click output
  private clickBuffer: AudioBuffer | null = null;  // pre-rendered click noise
  private vibratoDelay: DelayNode | null = null;
  private vibratoLfo: OscillatorNode | null = null;
  private vibratoLfoGain: GainNode | null = null;
  private vibratoWet: GainNode | null = null;
  private vibratoDry: GainNode | null = null;
  private vibratoMerge: GainNode | null = null;
  private overdrivePreFilter: BiquadFilterNode | null = null; // warm LP before shaper
  private overdrivePreGain: GainNode | null = null;
  private overdriveShaper: WaveShaperNode | null = null;
  private overdrivePostGain: GainNode | null = null;

  // Leslie nodes
  private leslieEnabled = true;
  private leslieDry: GainNode | null = null;
  private leslieWet: GainNode | null = null;
  private leslieMerge: GainNode | null = null;
  private leslieLeakGain: GainNode | null = null;   // 15% direct signal leak
  private leslieHpf: BiquadFilterNode | null = null;
  private leslieLpf: BiquadFilterNode | null = null;
  private hornFilterA: BiquadFilterNode | null = null; // LPF 4500Hz
  private hornFilterB: BiquadFilterNode | null = null; // Low-shelf 300Hz
  private drumFilter: BiquadFilterNode | null = null;  // High-shelf 812Hz
  private hornLfo: OscillatorNode | null = null;
  private hornLfoGain: GainNode | null = null;
  private hornDelay: DelayNode | null = null;
  private hornAm: GainNode | null = null;
  private hornAmLfo: OscillatorNode | null = null;
  private hornAmLfoGain: GainNode | null = null;
  private drumLfo: OscillatorNode | null = null;
  private drumLfoGain: GainNode | null = null;
  private drumDelay: DelayNode | null = null;
  private drumAm: GainNode | null = null;
  private drumAmLfo: OscillatorNode | null = null;
  private drumAmLfoGain: GainNode | null = null;

  private voices: Voice[] = [];
  private ageCounter = 0;
  private activeNoteCount = 0; // for percussion single-trigger

  // ── State ────────────────────────────────────────────────────────────

  private drawbarValues: number[] = [8, 3, 8, 4, 0, 2, 0, 0, 0]; // warm default
  private clickLevel = 0.3;
  private percEnabled = false;
  private percHarmonic: PercHarmonic = '2nd';
  private percVolume: PercVolume = 'normal';
  private percDecay: PercDecay = 'fast';
  private vibratoMode: VibratoMode = 'C1'; // subtle chorus for warmth
  private overdriveAmount = 0;
  private currentLeslieSpeed: LeslieSpeed = 'slow';
  private swellLevel = 1.0;

  // ── InstrumentAdapter ──────────────────────────────────────────────

  async init(ctx: AudioContext, outputNode: AudioNode): Promise<void> {
    this.ctx = ctx;

    // ── Tonewheel PeriodicWave (subtle harmonics, not pure sine) ────
    // Real tonewheels have ~3-10% THD from mechanical imperfections
    const real = new Float32Array([0, 1, 0.04, 0.06, 0, 0.02, 0, 0.015]);
    const imag = new Float32Array(real.length);
    this.tonewheelWave = ctx.createPeriodicWave(real, imag, { disableNormalization: false });

    // ── Build signal chain (right-to-left) ──────────────────────────

    // Master output
    this.masterGain = ctx.createGain();
    this.masterGain.gain.value = 0.4;
    this.masterGain.connect(outputNode);

    // Leslie section → masterGain
    this.buildLeslie(ctx);
    this.leslieMerge!.connect(this.masterGain);

    // Overdrive → Leslie input (with pre-filter for warmth)
    this.overdrivePreFilter = ctx.createBiquadFilter();
    this.overdrivePreFilter.type = 'lowpass';
    this.overdrivePreFilter.frequency.value = 6000; // warm LP before shaper
    this.overdrivePreFilter.Q.value = 0.7;

    this.overdrivePreGain = ctx.createGain();
    this.overdrivePreGain.gain.value = 1;
    this.overdriveShaper = ctx.createWaveShaper();
    this.overdriveShaper.oversample = '2x';
    this.updateOverdriveCurve(0);
    this.overdrivePostGain = ctx.createGain();
    this.overdrivePostGain.gain.value = 1;

    this.overdrivePreFilter.connect(this.overdrivePreGain);
    this.overdrivePreGain.connect(this.overdriveShaper);
    this.overdriveShaper.connect(this.overdrivePostGain);
    this.overdrivePostGain.connect(this.leslieDry!);
    this.overdrivePostGain.connect(this.leslieHpf!);
    this.overdrivePostGain.connect(this.leslieLpf!);
    this.overdrivePostGain.connect(this.leslieLeakGain!);

    // Vibrato → Overdrive pre-filter
    this.buildVibrato(ctx);
    this.vibratoMerge!.connect(this.overdrivePreFilter);

    // Voice bus → Vibrato input
    this.voiceBus = ctx.createGain();
    this.voiceBus.gain.value = 1;
    this.voiceBus.connect(this.vibratoDry!);
    this.voiceBus.connect(this.vibratoDelay!);

    // Click bus → Overdrive (bypasses vibrato — click should be dry)
    this.clickBus = ctx.createGain();
    this.clickBus.gain.value = this.clickLevel;
    this.clickBus.connect(this.overdrivePreFilter);

    // Pre-render click noise buffer
    this.clickBuffer = this.createClickBuffer(ctx);

    // Apply initial Leslie speed
    this.applyLeslieSpeed(this.currentLeslieSpeed);

    // Apply initial vibrato mode (default is C1)
    this.setVibratoMode(this.vibratoMode);
  }

  noteOn(note: number, velocity: number, time?: number): void {
    if (!this.ctx || !this.voiceBus) return;
    const t = time ?? this.ctx.currentTime;

    // Duplicate check
    if (this.voices.find((v) => v.note === note)) return;

    // Voice stealing
    if (this.voices.length >= MAX_VOICES) {
      let oldest = this.voices[0];
      for (let i = 1; i < this.voices.length; i++) {
        if (this.voices[i].age < oldest.age) oldest = this.voices[i];
      }
      this.releaseVoice(oldest, t);
    }

    const velGain = Math.max(0, Math.min(1, velocity / 127));
    const baseFreq = midiToFreq(note);
    const wasEmpty = this.activeNoteCount === 0;
    this.activeNoteCount++;

    // ── Voice oscillators ──────────────────────────────────────────
    const mixer = this.ctx.createGain();
    mixer.gain.value = velGain * this.swellLevel;
    mixer.connect(this.voiceBus!);

    const oscillators: OscillatorNode[] = [];
    const drawbarGains: GainNode[] = [];

    for (let i = 0; i < 9; i++) {
      const detune = WHEEL_DETUNE[note * 9 + i];
      const freq = baseFreq * HARMONIC_RATIOS[i] * detune;
      const osc = this.ctx.createOscillator();
      if (this.tonewheelWave) {
        osc.setPeriodicWave(this.tonewheelWave);
      } else {
        osc.type = 'sine';
      }

      const gain = this.ctx.createGain();
      if (freq > this.ctx.sampleRate / 2) {
        osc.frequency.setValueAtTime(20, t);
        gain.gain.setValueAtTime(0, t);
      } else {
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(DRAWBAR_TAPER[this.drawbarValues[i]], t);
      }

      osc.connect(gain);
      gain.connect(mixer);
      osc.start(t);
      oscillators.push(osc);
      drawbarGains.push(gain);
    }

    // ── Percussion (Phase 4) ───────────────────────────────────────
    let percOsc: OscillatorNode | null = null;
    let percGain: GainNode | null = null;

    if (this.percEnabled && wasEmpty) {
      const percRatio = this.percHarmonic === '2nd' ? HARMONIC_RATIOS[3] : HARMONIC_RATIOS[4];
      const percFreq = baseFreq * percRatio;

      if (percFreq < this.ctx.sampleRate / 2) {
        percOsc = this.ctx.createOscillator();
        percOsc.type = 'sine';
        percOsc.frequency.setValueAtTime(percFreq, t);

        percGain = this.ctx.createGain();
        const peakAmp = this.percVolume === 'normal' ? 1.0 : 0.5;  // setBfree: 1.0 / 0.5012
        const decayTime = this.percDecay === 'fast' ? 1.0 : 4.0;   // setBfree: 1.0s / 4.0s to -60dB
        percGain.gain.setValueAtTime(peakAmp, t);
        percGain.gain.exponentialRampToValueAtTime(0.001, t + decayTime);

        percOsc.connect(percGain);
        percGain.connect(mixer);
        percOsc.start(t);
        percOsc.stop(t + decayTime + 0.05);
      }
    }

    // ── Key Click (Phase 3) ────────────────────────────────────────
    if (this.clickLevel > 0 && this.clickBuffer && this.clickBus) {
      const clickSrc = this.ctx.createBufferSource();
      clickSrc.buffer = this.clickBuffer;
      const clickGain = this.ctx.createGain();
      clickGain.gain.value = velGain; // velocity scales click
      clickSrc.connect(clickGain);
      clickGain.connect(this.clickBus);
      clickSrc.start(t);
    }

    this.voices.push({
      note,
      oscillators,
      drawbarGains,
      percOsc,
      percGain,
      mixer,
      age: this.ageCounter++,
    });
  }

  noteOff(note: number, time?: number): void {
    const t = time ?? this.ctx?.currentTime ?? 0;
    const idx = this.voices.findIndex((v) => v.note === note);
    if (idx === -1) return;
    this.activeNoteCount = Math.max(0, this.activeNoteCount - 1);
    this.releaseVoice(this.voices[idx], t);
  }

  allNotesOff(): void {
    const t = this.ctx?.currentTime ?? 0;
    for (const voice of [...this.voices]) {
      this.releaseVoice(voice, t, 0.02);
    }
    this.activeNoteCount = 0;
  }

  panic(): void {
    const t = this.ctx?.currentTime ?? 0;
    for (const voice of [...this.voices]) {
      this.releaseVoice(voice, t, 0);
    }
    this.activeNoteCount = 0;
  }

  dispose(): void {
    this.panic();

    // Tear down LFOs (must stop oscillators)
    try { this.hornLfo?.stop(); } catch { /* ok */ }
    try { this.hornAmLfo?.stop(); } catch { /* ok */ }
    try { this.drumLfo?.stop(); } catch { /* ok */ }
    try { this.drumAmLfo?.stop(); } catch { /* ok */ }
    try { this.vibratoLfo?.stop(); } catch { /* ok */ }

    // Disconnect everything
    const nodes: (AudioNode | null)[] = [
      this.masterGain, this.voiceBus, this.clickBus,
      this.vibratoDelay, this.vibratoLfo, this.vibratoLfoGain,
      this.vibratoWet, this.vibratoDry, this.vibratoMerge,
      this.overdrivePreFilter, this.overdrivePreGain, this.overdriveShaper, this.overdrivePostGain,
      this.leslieDry, this.leslieWet, this.leslieMerge, this.leslieLeakGain,
      this.leslieHpf, this.leslieLpf,
      this.hornFilterA, this.hornFilterB, this.drumFilter,
      this.hornLfo, this.hornLfoGain, this.hornDelay, this.hornAm,
      this.hornAmLfo, this.hornAmLfoGain,
      this.drumLfo, this.drumLfoGain, this.drumDelay, this.drumAm,
      this.drumAmLfo, this.drumAmLfoGain,
    ];
    for (const n of nodes) {
      try { n?.disconnect(); } catch { /* ok */ }
    }

    this.ctx = null;
    this.voices = [];
  }

  // ── Drawbar API ────────────────────────────────────────────────────

  setDrawbar(index: number, value: number): void {
    if (index < 0 || index > 8) return;
    const clamped = Math.round(Math.max(0, Math.min(8, value)));
    this.drawbarValues[index] = clamped;
    const amp = DRAWBAR_TAPER[clamped];
    const t = this.ctx?.currentTime ?? 0;
    for (const voice of this.voices) {
      voice.drawbarGains[index].gain.setTargetAtTime(amp, t, 0.005);
    }
  }

  setDrawbars(values: number[]): void {
    for (let i = 0; i < 9; i++) {
      if (values[i] != null) this.setDrawbar(i, values[i]);
    }
  }

  getDrawbars(): number[] {
    return [...this.drawbarValues];
  }

  // ── Key Click API (Phase 3) ────────────────────────────────────────

  setClickLevel(level: number): void {
    this.clickLevel = Math.max(0, Math.min(1, level));
    if (this.clickBus) {
      this.clickBus.gain.setTargetAtTime(this.clickLevel, this.ctx?.currentTime ?? 0, 0.01);
    }
  }

  getClickLevel(): number {
    return this.clickLevel;
  }

  // ── Percussion API (Phase 4) ───────────────────────────────────────

  setPercEnabled(enabled: boolean): void { this.percEnabled = enabled; }
  getPercEnabled(): boolean { return this.percEnabled; }

  setPercHarmonic(h: PercHarmonic): void { this.percHarmonic = h; }
  getPercHarmonic(): PercHarmonic { return this.percHarmonic; }

  setPercVolume(v: PercVolume): void { this.percVolume = v; }
  getPercVolume(): PercVolume { return this.percVolume; }

  setPercDecay(d: PercDecay): void { this.percDecay = d; }
  getPercDecay(): PercDecay { return this.percDecay; }

  // ── Vibrato/Chorus API (Phase 5) ───────────────────────────────────

  setVibratoMode(mode: VibratoMode): void {
    this.vibratoMode = mode;
    if (!this.ctx) return;
    const t = this.ctx.currentTime;

    if (mode === 'off') {
      this.vibratoDry!.gain.setTargetAtTime(1, t, 0.01);
      this.vibratoWet!.gain.setTargetAtTime(0, t, 0.01);
      this.vibratoLfoGain!.gain.setTargetAtTime(0, t, 0.01);
    } else {
      const depth = VIBRATO_DEPTH[mode] ?? 0;
      const isChorus = mode.startsWith('C');
      // setBfree: chorus = equal-power mix (0.7071 each), vibrato = wet only
      this.vibratoDry!.gain.setTargetAtTime(isChorus ? 0.7071 : 0, t, 0.01);
      this.vibratoWet!.gain.setTargetAtTime(isChorus ? 0.7071 : 1, t, 0.01);
      this.vibratoLfoGain!.gain.setTargetAtTime(depth, t, 0.01);
    }
  }

  getVibratoMode(): VibratoMode { return this.vibratoMode; }

  // ── Overdrive API (Phase 6) ────────────────────────────────────────

  setOverdrive(amount: number): void {
    this.overdriveAmount = Math.max(0, Math.min(1, amount));
    this.updateOverdriveCurve(this.overdriveAmount);
    if (this.overdrivePreGain && this.ctx) {
      // Push gain into clipping range
      const preGainVal = 1 + this.overdriveAmount * 9;
      const postGainVal = 1 / Math.sqrt(preGainVal);
      const t = this.ctx.currentTime;
      this.overdrivePreGain.gain.setTargetAtTime(preGainVal, t, 0.01);
      this.overdrivePostGain!.gain.setTargetAtTime(postGainVal, t, 0.01);
    }
  }

  getOverdrive(): number { return this.overdriveAmount; }

  // ── Leslie API (Phase 7) ───────────────────────────────────────────

  setLeslieSpeed(speed: LeslieSpeed): void {
    this.currentLeslieSpeed = speed;
    this.applyLeslieSpeed(speed);
  }

  getLeslieSpeed(): LeslieSpeed { return this.currentLeslieSpeed; }

  setLeslieEnabled(enabled: boolean): void {
    this.leslieEnabled = enabled;
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    if (enabled) {
      this.leslieDry!.gain.setTargetAtTime(0.3, t, 0.05);
      this.leslieWet!.gain.setTargetAtTime(0.7, t, 0.05);
    } else {
      this.leslieDry!.gain.setTargetAtTime(1, t, 0.05);
      this.leslieWet!.gain.setTargetAtTime(0, t, 0.05);
    }
  }

  getLeslieEnabled(): boolean { return this.leslieEnabled; }

  // ── Swell API ──────────────────────────────────────────────────────

  setSwellLevel(level: number): void {
    this.swellLevel = Math.max(0, Math.min(1, level));
    const t = this.ctx?.currentTime ?? 0;
    for (const voice of this.voices) {
      voice.mixer.gain.setTargetAtTime(this.swellLevel, t, 0.01);
    }
  }

  getSwellLevel(): number { return this.swellLevel; }

  // ── Presets ──────────────────────────────────────────────────────────

  loadPreset(preset: OrganPreset): void {
    this.setDrawbars(preset.drawbars);
  }

  // ── State serialization ────────────────────────────────────────────

  getState(): OrganState {
    return {
      drawbars: [...this.drawbarValues],
      clickLevel: this.clickLevel,
      percEnabled: this.percEnabled,
      percHarmonic: this.percHarmonic,
      percVolume: this.percVolume,
      percDecay: this.percDecay,
      vibratoMode: this.vibratoMode,
      overdrive: this.overdriveAmount,
      leslieSpeed: this.currentLeslieSpeed,
      leslieEnabled: this.leslieEnabled,
      swellLevel: this.swellLevel,
    };
  }

  setState(s: Partial<OrganState>): void {
    if (s.drawbars) this.setDrawbars(s.drawbars);
    if (s.clickLevel != null) this.setClickLevel(s.clickLevel);
    if (s.percEnabled != null) this.setPercEnabled(s.percEnabled);
    if (s.percHarmonic) this.setPercHarmonic(s.percHarmonic);
    if (s.percVolume) this.setPercVolume(s.percVolume);
    if (s.percDecay) this.setPercDecay(s.percDecay);
    if (s.vibratoMode) this.setVibratoMode(s.vibratoMode);
    if (s.overdrive != null) this.setOverdrive(s.overdrive);
    if (s.leslieSpeed) this.setLeslieSpeed(s.leslieSpeed);
    if (s.leslieEnabled != null) this.setLeslieEnabled(s.leslieEnabled);
    if (s.swellLevel != null) this.setSwellLevel(s.swellLevel);
  }

  // ── Private: Voice release ─────────────────────────────────────────

  private releaseVoice(voice: Voice, time: number, fadeTime = 0.008): void {
    const idx = this.voices.indexOf(voice);
    if (idx === -1) return;
    this.voices.splice(idx, 1);

    if (fadeTime > 0) {
      voice.mixer.gain.setTargetAtTime(0, time, fadeTime);
      const stopTime = time + fadeTime * 5;
      for (const osc of voice.oscillators) osc.stop(stopTime);
      if (voice.percOsc) try { voice.percOsc.stop(stopTime); } catch { /* ok */ }

      setTimeout(() => {
        for (const osc of voice.oscillators) { try { osc.disconnect(); } catch { /* */ } }
        for (const g of voice.drawbarGains) { try { g.disconnect(); } catch { /* */ } }
        if (voice.percOsc) try { voice.percOsc.disconnect(); } catch { /* */ }
        if (voice.percGain) try { voice.percGain.disconnect(); } catch { /* */ }
        try { voice.mixer.disconnect(); } catch { /* */ }
      }, (fadeTime * 5 + 0.05) * 1000);
    } else {
      for (const osc of voice.oscillators) { try { osc.stop(time); osc.disconnect(); } catch { /* */ } }
      for (const g of voice.drawbarGains) { try { g.disconnect(); } catch { /* */ } }
      if (voice.percOsc) try { voice.percOsc.stop(time); voice.percOsc.disconnect(); } catch { /* */ }
      if (voice.percGain) try { voice.percGain.disconnect(); } catch { /* */ }
      try { voice.mixer.disconnect(); } catch { /* */ }
    }
  }

  // ── Private: Key Click buffer (Phase 3) ────────────────────────────

  private createClickBuffer(ctx: AudioContext): AudioBuffer {
    const duration = 0.020; // 20ms — enough for full bounce tail
    const len = Math.ceil(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    // Model contact bounce: 4 rapid transients over ~5ms, then ring-out
    // Real B3 key contacts produce a series of sharp electrical bounces
    const numBounces = 4;
    const bounceInterval = 0.0012; // 1.2ms between bounces

    for (let b = 0; b < numBounces; b++) {
      const bounceStart = b * bounceInterval;
      const bounceAmp = 1.0 - b * 0.25; // each bounce quieter
      for (let i = 0; i < len; i++) {
        const t = i / ctx.sampleRate;
        const localT = t - bounceStart;
        if (localT < 0 || localT > 0.002) continue;
        // Sharp transient envelope
        const env = Math.exp(-localT / 0.0003);
        // Broadband content: noise + multiple resonances (500–4kHz)
        const noise = (Math.random() * 2 - 1) * 0.5;
        const hi = Math.sin(2 * Math.PI * 2500 * t) * 0.3;
        const lo = Math.sin(2 * Math.PI * 800 * t) * 0.2;
        data[i] += bounceAmp * env * (noise + hi + lo);
      }
    }

    return buffer;
  }

  // ── Private: Vibrato/Chorus (Phase 5) ──────────────────────────────

  private buildVibrato(ctx: AudioContext): void {
    // Dry path
    this.vibratoDry = ctx.createGain();
    this.vibratoDry.gain.value = 1; // default: all dry (vibrato off)

    // Wet path: single variable-delay modulated by LFO (setBfree approach)
    this.vibratoDelay = ctx.createDelay(0.01);
    this.vibratoDelay.delayTime.value = 0.002; // 2ms base delay

    this.vibratoLfo = ctx.createOscillator();
    this.vibratoLfo.type = 'sine';
    this.vibratoLfo.frequency.value = VIBRATO_RATE;

    this.vibratoLfoGain = ctx.createGain();
    this.vibratoLfoGain.gain.value = 0; // off by default

    this.vibratoLfo.connect(this.vibratoLfoGain);
    this.vibratoLfoGain.connect(this.vibratoDelay.delayTime);
    this.vibratoLfo.start();

    this.vibratoWet = ctx.createGain();
    this.vibratoWet.gain.value = 0;
    this.vibratoDelay.connect(this.vibratoWet);

    // Merge dry + wet
    this.vibratoMerge = ctx.createGain();
    this.vibratoDry.connect(this.vibratoMerge);
    this.vibratoWet.connect(this.vibratoMerge);
  }

  // ── Private: Overdrive curve (Phase 6) ─────────────────────────────

  private updateOverdriveCurve(amount: number): void {
    if (!this.overdriveShaper) return;
    const samples = 8192;
    const curve = new Float32Array(samples);
    const drive = 1 + amount * 9; // 1–10
    // Asymmetric soft clipping: positive side clips earlier (tube bias)
    // This adds even harmonics for warmth, unlike symmetric tanh
    const bias = 0.15;
    for (let i = 0; i < samples; i++) {
      const x = (i / (samples - 1)) * 2 - 1; // -1 to +1
      const biased = x + bias;
      curve[i] = Math.tanh(drive * biased) * 0.95;
    }
    this.overdriveShaper.curve = curve;
  }

  // ── Private: Leslie Speaker (Phase 7) ──────────────────────────────

  private buildLeslie(ctx: AudioContext): void {
    // Dry/wet blend
    this.leslieDry = ctx.createGain();
    this.leslieDry.gain.value = 0.3;
    this.leslieWet = ctx.createGain();
    this.leslieWet.gain.value = 0.7;
    this.leslieMerge = ctx.createGain();
    this.leslieDry.connect(this.leslieMerge);
    this.leslieWet.connect(this.leslieMerge);

    // Leak path: 15% direct signal bypasses rotary (setBfree leakLevel)
    this.leslieLeakGain = ctx.createGain();
    this.leslieLeakGain.gain.value = 0.15;
    this.leslieLeakGain.connect(this.leslieMerge);

    // Crossover filters
    this.leslieHpf = ctx.createBiquadFilter();
    this.leslieHpf.type = 'highpass';
    this.leslieHpf.frequency.value = LESLIE_CROSSOVER;

    this.leslieLpf = ctx.createBiquadFilter();
    this.leslieLpf.type = 'lowpass';
    this.leslieLpf.frequency.value = LESLIE_CROSSOVER;

    // ── Horn tone-shaping filters (setBfree hornFilterA/B) ──────────
    this.hornFilterA = ctx.createBiquadFilter();
    this.hornFilterA.type = 'lowpass';
    this.hornFilterA.frequency.value = 4500;
    this.hornFilterA.Q.value = 2.7456;

    this.hornFilterB = ctx.createBiquadFilter();
    this.hornFilterB.type = 'lowshelf';
    this.hornFilterB.frequency.value = 300;
    this.hornFilterB.gain.value = -30;

    // ── Horn (high frequencies) ──────────────────────────────────────
    // AM: ~6dB tremolo depth (setBfree principal component range)
    this.hornAm = ctx.createGain();
    this.hornAm.gain.value = 0.75;

    this.hornAmLfo = ctx.createOscillator();
    this.hornAmLfo.type = 'sine';
    this.hornAmLfo.frequency.value = LESLIE_HORN_SLOW;

    this.hornAmLfoGain = ctx.createGain();
    this.hornAmLfoGain.gain.value = 0.25;

    this.hornAmLfo.connect(this.hornAmLfoGain);
    this.hornAmLfoGain.connect(this.hornAm.gain);
    this.hornAmLfo.start();

    // Doppler: physics-correct depth from horn geometry
    // Horn radius 19.2cm, mic 42cm → LFO amp ≈ 0.0006s
    this.hornDelay = ctx.createDelay(0.01);
    this.hornDelay.delayTime.value = 0.002;

    this.hornLfo = ctx.createOscillator();
    this.hornLfo.type = 'sine';
    this.hornLfo.frequency.value = LESLIE_HORN_SLOW;

    this.hornLfoGain = ctx.createGain();
    this.hornLfoGain.gain.value = 0.0006;

    this.hornLfo.connect(this.hornLfoGain);
    this.hornLfoGain.connect(this.hornDelay.delayTime);
    // 90° phase offset from AM LFO
    const hornPeriod = 1 / LESLIE_HORN_SLOW;
    this.hornLfo.start(ctx.currentTime + hornPeriod * 0.25);

    // Horn chain: HPF → filterA → filterB → delay → AM → wet
    this.leslieHpf.connect(this.hornFilterA);
    this.hornFilterA.connect(this.hornFilterB);
    this.hornFilterB.connect(this.hornDelay);
    this.hornDelay.connect(this.hornAm);
    this.hornAm.connect(this.leslieWet);

    // ── Drum (low frequencies) ───────────────────────────────────────
    this.drumAm = ctx.createGain();
    this.drumAm.gain.value = 0.88;

    this.drumAmLfo = ctx.createOscillator();
    this.drumAmLfo.type = 'sine';
    this.drumAmLfo.frequency.value = LESLIE_DRUM_SLOW;

    this.drumAmLfoGain = ctx.createGain();
    this.drumAmLfoGain.gain.value = 0.12;

    this.drumAmLfo.connect(this.drumAmLfoGain);
    this.drumAmLfoGain.connect(this.drumAm.gain);
    this.drumAmLfo.start();

    // Doppler: drum radius 22cm → LFO amp ≈ 0.00065s
    this.drumDelay = ctx.createDelay(0.01);
    this.drumDelay.delayTime.value = 0.003;

    this.drumLfo = ctx.createOscillator();
    this.drumLfo.type = 'sine';
    this.drumLfo.frequency.value = LESLIE_DRUM_SLOW;

    this.drumLfoGain = ctx.createGain();
    this.drumLfoGain.gain.value = 0.00065;

    this.drumLfo.connect(this.drumLfoGain);
    this.drumLfoGain.connect(this.drumDelay.delayTime);
    // 90° phase offset from drum AM LFO
    const drumPeriod = 1 / LESLIE_DRUM_SLOW;
    this.drumLfo.start(ctx.currentTime + drumPeriod * 0.25);

    // Drum tone-shaping filter (setBfree high-shelf crossover)
    this.drumFilter = ctx.createBiquadFilter();
    this.drumFilter.type = 'highshelf';
    this.drumFilter.frequency.value = 812;
    this.drumFilter.Q.value = 1.6;
    this.drumFilter.gain.value = -38.93;

    // Drum chain: LPF → delay → AM → drumFilter → wet
    this.leslieLpf.connect(this.drumDelay);
    this.drumDelay.connect(this.drumAm);
    this.drumAm.connect(this.drumFilter);
    this.drumFilter.connect(this.leslieWet);
  }

  private applyLeslieSpeed(speed: LeslieSpeed): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;

    let hornRate: number;
    let drumRate: number;

    switch (speed) {
      case 'stop':
        hornRate = 0;
        drumRate = 0;
        break;
      case 'slow':
        hornRate = LESLIE_HORN_SLOW;
        drumRate = LESLIE_DRUM_SLOW;
        break;
      case 'fast':
        hornRate = LESLIE_HORN_FAST;
        drumRate = LESLIE_DRUM_FAST;
        break;
    }

    // Determine accel vs decel per rotor (setBfree uses different time constants)
    const curHorn = this.hornLfo!.frequency.value;
    const curDrum = this.drumLfo!.frequency.value;
    const hornTc = (hornRate > curHorn ? LESLIE_HORN_ACCEL : LESLIE_HORN_DECEL) / 3;
    const drumTc = (drumRate > curDrum ? LESLIE_DRUM_ACCEL : LESLIE_DRUM_DECEL) / 3;

    this.hornLfo!.frequency.setTargetAtTime(hornRate, t, hornTc);
    this.hornAmLfo!.frequency.setTargetAtTime(hornRate, t, hornTc);
    this.drumLfo!.frequency.setTargetAtTime(drumRate, t, drumTc);
    this.drumAmLfo!.frequency.setTargetAtTime(drumRate, t, drumTc);

    // Reduce modulation depth when stopped
    if (speed === 'stop') {
      this.hornAmLfoGain!.gain.setTargetAtTime(0.02, t, 0.5);
      this.drumAmLfoGain!.gain.setTargetAtTime(0.02, t, 0.5);
    } else {
      this.hornAmLfoGain!.gain.setTargetAtTime(0.25, t, 0.2);
      this.drumAmLfoGain!.gain.setTargetAtTime(0.12, t, 0.2);
    }
  }
}
