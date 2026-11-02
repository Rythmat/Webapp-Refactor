// ── The labs' sound ────────────────────────────────────────────────────────
// Tones a lab turns on, glides and turns off, any number at once (HarmonicTone
// plays one at a time, which can't do beats or interference): pure, or a stack
// of harmonics scaled to the same peak, and held or shaped by an envelope.
// Everything meets a limiter and a ceiling nothing can pass, before the
// lesson's volume: a student drags these sliders blind, often in headphones.
//
//   voices → mix → limiter → ceiling → tap → output (a bus channel)
//
// The owner of the graph makes this on a first gesture, and calls close() on
// leaving; the context itself is the app's and is never closed here.

import { safeEnvelope, type Envelope } from './physics/envelope';
import type { Recipe } from './physics/harmonics';

/** The ceiling everything meets at the end, in linear gain: −3 dBFS. */
export const OUTPUT_CEILING = 0.708;

/** One voice at full level, in linear gain: −12 dBFS. */
export const VOICE_CAP = 0.251;

/** The range a lab may sound in: nothing a speaker can't move or that stings. */
export const MIN_HZ = 20;
export const MAX_HZ = 8000;

/** A held tone fades after this long: nobody means to leave one on. */
export const AUTO_FADE_MS = 20_000;

/** How long a start or a stop ramps, so neither clicks. */
const RAMP_SECONDS = 0.015;
/** How quickly a glide follows a dragged slider. */
const GLIDE_SECONDS = 0.03;
/** How long the auto fade takes, so it reads as a fade and not a fault. */
const AUTO_FADE_SECONDS = 1.2;

const clampHz = (hz: number) => Math.min(MAX_HZ, Math.max(MIN_HZ, hz));

/**
 * The ear is far more sensitive around 1–5 kHz: a tone there at the same level
 * sounds much louder and can sting. Up to 9 dB off at its peak, near 2.5 kHz,
 * nearly nothing by two octaves away.
 */
export function earTrim(hz: number): number {
  const octaves = Math.log2(hz / 2500);
  const db = -9 * Math.exp(-(octaves * octaves) / (2 * 1.3 * 1.3));
  return 10 ** (db / 20);
}

/** The gain a voice runs at, for a level of 0..1 (clamped). */
export const voiceGain = (level: number, hz: number) =>
  Math.min(1, Math.max(0, level)) * VOICE_CAP * earTrim(clampHz(hz));

const ceilingCurve = (() => {
  let curve: Float32Array | null = null;
  return () => {
    if (curve) return curve;
    const samples = 2049;
    curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i - 1024) / 1024;
      curve[i] = Math.tanh(x * 1.1) * OUTPUT_CEILING;
    }
    return curve;
  };
})();

interface Voice {
  /** What's sounding: a loop has no frequency to glide. */
  osc: AudioScheduledSourceNode;
  gain: GainNode;
  /** The auto fade's timer, restarted by any change the student makes. */
  fade: ReturnType<typeof setTimeout>;
  /** What it's playing, so an unchanged one isn't set again. */
  harmonics?: Recipe;
  /** Set for a shaped note: how long it takes to let go. */
  release?: number;
  /** Set for a pair: its second tone's path and its delay. */
  pair?: { nodes: readonly AudioNode[]; delay: DelayNode };
}

/** Quick enough to follow a dragged slider, slow enough not to click. */
const LOOP_CROSSFADE_SECONDS = 0.008;
/** A pair's two tones are each half a voice, so their sum can't pass one. */
const PAIR_BRANCH = 0.5;
const MAX_DELAY_SECONDS = 0.1;
/** Fine enough to tell low notes apart on the spectrum. */
const SPECTRUM_FFT = 8192;

export class LabAudio {
  private readonly ctx: BaseAudioContext;
  private readonly mix: GainNode;
  private readonly limiter: DynamicsCompressorNode;
  private readonly ceiling: WaveShaperNode;
  private readonly tap: AnalyserNode;
  private readonly output: AudioNode;
  private readonly voices = new Map<string, Voice>();
  private readonly onFaded?: (id: string) => void;
  private readonly scratch: Float32Array<ArrayBuffer>;
  private closed = false;
  private spectrumTap: AnalyserNode | null = null;
  private spectrumData: Float32Array<ArrayBuffer> | null = null;

  constructor({
    context,
    output,
    onFaded,
  }: {
    context: BaseAudioContext;
    output: AudioNode;
    /** A voice stopped by itself after AUTO_FADE_MS. */
    onFaded?: (id: string) => void;
  }) {
    this.ctx = context;
    this.output = output;
    this.onFaded = onFaded;
    this.mix = context.createGain();
    this.limiter = context.createDynamicsCompressor();
    this.limiter.threshold.value = -9;
    this.limiter.ratio.value = 20;
    this.limiter.knee.value = 3;
    this.limiter.attack.value = 0.002;
    this.limiter.release.value = 0.12;
    this.ceiling = context.createWaveShaper();
    this.ceiling.curve = ceilingCurve() as Float32Array<ArrayBuffer>;
    this.tap = context.createAnalyser();
    this.tap.fftSize = 2048;
    this.scratch = new Float32Array(this.tap.fftSize);
    this.mix.connect(this.limiter);
    this.limiter.connect(this.ceiling);
    this.ceiling.connect(this.tap);
    this.tap.connect(output);
  }

  /**
   * Start a voice, or glide one already sounding to these values. `harmonics`
   * makes it a stack (left out, a pure tone), never louder than a pure tone.
   */
  set(id: string, hz: number, level = 1, harmonics?: Recipe): void {
    if (this.closed) return;
    const safeHz = clampHz(hz);
    const target = voiceGain(level, safeHz);
    const now = this.ctx.currentTime;
    const voice = this.voices.get(id);
    if (voice) {
      clearTimeout(voice.fade);
      voice.fade = this.scheduleFade(id);
      const osc = voice.osc as OscillatorNode;
      osc.frequency.setTargetAtTime(safeHz, now, GLIDE_SECONDS);
      voice.gain.gain.setTargetAtTime(target, now, GLIDE_SECONDS);
      if (harmonics && harmonics !== voice.harmonics) {
        osc.setPeriodicWave(this.periodicWave(harmonics));
        voice.harmonics = harmonics;
      }
      return;
    }
    this.startVoice(id, safeHz, harmonics).gain.gain.setTargetAtTime(
      target,
      now,
      RAMP_SECONDS,
    );
  }

  /** Start a note on an envelope's shape, held until noteOff. */
  noteOn(
    id: string,
    hz: number,
    envelope: Envelope,
    harmonics?: Recipe,
    level = 1,
  ): void {
    if (this.closed) return;
    this.stop(id);
    const safeHz = clampHz(hz);
    const env = safeEnvelope(envelope);
    const peak = voiceGain(level, safeHz);
    const now = this.ctx.currentTime;
    const voice = this.startVoice(id, safeHz, harmonics);
    voice.release = env.release;
    const { gain } = voice.gain;
    gain.setValueAtTime(0, now);
    gain.linearRampToValueAtTime(peak, now + env.attack);
    if (env.decay > 0) {
      gain.linearRampToValueAtTime(
        peak * env.sustain,
        now + env.attack + env.decay,
      );
    }
  }

  /** Let a note go, from wherever its envelope had reached. */
  noteOff(id: string): void {
    const voice = this.voices.get(id);
    if (!voice) return;
    this.voices.delete(id);
    clearTimeout(voice.fade);
    const now = this.ctx.currentTime;
    const seconds = voice.release ?? RAMP_SECONDS;
    const { gain } = voice.gain;
    const reached = gain.value;
    gain.cancelScheduledValues(now);
    gain.setValueAtTime(reached, now);
    gain.linearRampToValueAtTime(0, now + seconds);
    voice.osc.stop(now + seconds + 0.02);
    voice.osc.onended = () => this.disconnectVoice(voice);
  }

  /**
   * Two equal tones from one oscillator, the second `phase` degrees behind by a
   * real delay, so that they truly cancel in the air rather than being turned
   * down to match. Glides if it's already sounding.
   */
  setPair(id: string, hz: number, phase: number): void {
    if (this.closed) return;
    const safeHz = clampHz(hz);
    const delaySeconds = phase / 360 / safeHz;
    const now = this.ctx.currentTime;
    const existing = this.voices.get(id);
    if (existing?.pair) {
      clearTimeout(existing.fade);
      existing.fade = this.scheduleFade(id);
      (existing.osc as OscillatorNode).frequency.setTargetAtTime(
        safeHz,
        now,
        GLIDE_SECONDS,
      );
      existing.pair.delay.delayTime.setTargetAtTime(
        delaySeconds,
        now,
        GLIDE_SECONDS,
      );
      return;
    }
    this.stop(id);
    const voice = this.startVoice(id, safeHz);
    voice.osc.disconnect();
    const first = this.ctx.createGain();
    const second = this.ctx.createGain();
    const delay = this.ctx.createDelay(MAX_DELAY_SECONDS);
    first.gain.value = PAIR_BRANCH;
    second.gain.value = PAIR_BRANCH;
    delay.delayTime.value = delaySeconds;
    voice.osc.connect(first);
    first.connect(voice.gain);
    voice.osc.connect(delay);
    delay.connect(second);
    second.connect(voice.gain);
    voice.pair = { nodes: [first, second, delay], delay };
    voice.gain.gain.setTargetAtTime(voiceGain(1, safeHz), now, RAMP_SECONDS);
  }

  /**
   * Loop a computed waveform (peak ±1) through everything a tone goes through,
   * replacing whatever `id` was playing. For sounds a tone can't make: clipped,
   * quantized, or a signal with hum on it. `hz` sets the ear trim.
   */
  setLoop(
    id: string,
    samples: Float32Array<ArrayBuffer>,
    hz: number,
    level = 1,
  ) {
    if (this.closed) return;
    this.stop(id, LOOP_CROSSFADE_SECONDS);
    const buffer = this.ctx.createBuffer(
      1,
      samples.length,
      this.ctx.sampleRate,
    );
    buffer.copyToChannel(samples, 0);
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const gain = this.ctx.createGain();
    gain.gain.value = 0;
    gain.gain.setTargetAtTime(
      voiceGain(level, clampHz(hz)),
      this.ctx.currentTime,
      LOOP_CROSSFADE_SECONDS,
    );
    source.connect(gain);
    gain.connect(this.mix);
    source.start();
    this.voices.set(id, { osc: source, gain, fade: this.scheduleFade(id) });
  }

  get sampleRate(): number {
    return this.ctx.sampleRate;
  }

  isSounding(id: string): boolean {
    return this.voices.has(id);
  }

  /** Stop a voice. A no-op when it isn't sounding. */
  stop(id: string, seconds = RAMP_SECONDS): void {
    const voice = this.voices.get(id);
    if (!voice) return;
    this.voices.delete(id);
    clearTimeout(voice.fade);
    const now = this.ctx.currentTime;
    voice.gain.gain.cancelScheduledValues(now);
    voice.gain.gain.setTargetAtTime(0, now, seconds);
    // Five time constants: as good as silent.
    const stopAt = now + seconds * 5;
    voice.osc.stop(stopAt);
    voice.osc.onended = () => this.disconnectVoice(voice);
  }

  stopAll(): void {
    for (const id of [...this.voices.keys()]) this.stop(id);
  }

  /** The output's peak over the last few milliseconds, after the ceiling. */
  peak(): number {
    this.tap.getFloatTimeDomainData(this.scratch);
    let peak = 0;
    for (const sample of this.scratch) peak = Math.max(peak, Math.abs(sample));
    return peak;
  }

  /**
   * What's really leaving the page right now, in decibels per band, measured
   * after the ceiling. Its bands are `sampleRate / 2 / data.length` hertz wide.
   */
  spectrum(): { data: Float32Array<ArrayBuffer>; sampleRate: number } {
    if (!this.spectrumTap) {
      this.spectrumTap = this.ctx.createAnalyser();
      this.spectrumTap.fftSize = SPECTRUM_FFT;
      this.spectrumData = new Float32Array(this.spectrumTap.frequencyBinCount);
      this.ceiling.connect(this.spectrumTap);
    }
    const data = this.spectrumData as Float32Array<ArrayBuffer>;
    this.spectrumTap.getFloatFrequencyData(data);
    return { data, sampleRate: this.ctx.sampleRate };
  }

  /** Silence everything and leave the graph. The context carries on. */
  close(): void {
    if (this.closed) return;
    this.closed = true;
    for (const voice of this.voices.values()) {
      clearTimeout(voice.fade);
      voice.gain.gain.cancelScheduledValues(this.ctx.currentTime);
      voice.gain.gain.value = 0;
      voice.osc.onended = null;
      voice.osc.stop();
      this.disconnectVoice(voice);
    }
    this.voices.clear();
    this.spectrumTap?.disconnect();
    this.mix.disconnect();
    this.limiter.disconnect();
    this.ceiling.disconnect();
    this.tap.disconnect();
  }

  private disconnectVoice(voice: Voice): void {
    voice.osc.disconnect();
    voice.gain.disconnect();
    for (const node of voice.pair?.nodes ?? []) node.disconnect();
  }

  private startVoice(id: string, hz: number, harmonics?: Recipe): Voice {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    if (harmonics) osc.setPeriodicWave(this.periodicWave(harmonics));
    else osc.type = 'sine';
    osc.frequency.value = hz;
    gain.gain.value = 0;
    osc.connect(gain);
    gain.connect(this.mix);
    osc.start();
    const voice = { osc, gain, harmonics, fade: this.scheduleFade(id) };
    this.voices.set(id, voice);
    return voice;
  }

  /** Sines, as the picture draws them, scaled by the browser to a peak of 1. */
  private periodicWave(harmonics: Recipe): PeriodicWave {
    const size = Math.max(harmonics.length + 1, 2);
    const real = new Float32Array(size);
    const imag = new Float32Array(size);
    harmonics.forEach((amount, i) => {
      imag[i + 1] = amount;
    });
    return this.ctx.createPeriodicWave(real, imag);
  }

  private scheduleFade(id: string) {
    return setTimeout(() => {
      this.stop(id, AUTO_FADE_SECONDS / 5);
      this.onFaded?.(id);
    }, AUTO_FADE_MS);
  }
}
