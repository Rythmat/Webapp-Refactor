import { ANTI_CLICK_TIME, smoothParam } from './constants';

/** One note's set of unison oscillators (and their gain/pan nodes). */
interface UnisonGeneration {
  oscillators: OscillatorNode[];
  gains: GainNode[];
  panners: StereoPannerNode[];
  /** Context time the oscillators stop at (Infinity until scheduled). */
  stopAt: number;
  onEnded: (() => void) | null;
}

/**
 * Multi-voice unison engine. Creates N detuned oscillators with
 * symmetric detune spread and stereo pan distribution.
 * Blend control crossfades between center voice and detuned sum.
 *
 * Oscillators start and stop at scheduled context times (start(time),
 * stop(time)); their nodes are torn down from the oscillators' onended, so a
 * note scheduled ahead (or a whole song in an offline render) plays exactly
 * where it was placed.
 */
export class UnisonEngine {
  private ctx: AudioContext;
  private output: GainNode;

  private voiceCount: number = 1;
  private detuneSpread: number = 0; // total spread in cents
  private pitchBendCents: number = 0;
  private blend: number = 0.1; // 0 = only center, 1 = only detuned
  private stereoSpread: number = 1; // how wide the pan field is
  private currentFreq: number = 440;
  private currentWave: PeriodicWave | null = null;
  private currentType: OscillatorType = 'sine';
  private generation: UnisonGeneration | null = null;
  private vibratoSource: AudioNode | null = null;
  private detuneModSource: AudioNode | null = null;

  constructor(ctx: AudioContext, destination: AudioNode) {
    this.ctx = ctx;
    this.output = ctx.createGain();
    this.output.gain.value = 1;
    this.output.connect(destination);
  }

  /**
   * Starts a new set of oscillators at `time` (now when omitted). A set that
   * is still current is stopped at `time` first (if it isn't already).
   */
  start(time?: number): void {
    const t = time ?? this.ctx.currentTime;
    if (this.generation) this.scheduleStop(this.generation, t);
    this.buildGeneration(t);
  }

  /**
   * Stops the current oscillators at `time` (now when omitted), or earlier
   * than an already scheduled stop. They stay the current set until they end
   * (so pitch bend and edits still reach a release tail); then onended
   * disconnects them and calls `onEnded`. Returns false when there is no
   * current set.
   */
  stop(time?: number, onEnded?: () => void): boolean {
    const gen = this.generation;
    if (!gen) return false;
    if (onEnded) gen.onEnded = onEnded;
    this.scheduleStop(gen, time ?? this.ctx.currentTime);
    return true;
  }

  /** True while a set of oscillators is running with no stop scheduled. */
  private get isStarted(): boolean {
    return this.generation !== null && this.generation.stopAt === Infinity;
  }

  /**
   * Sets the pitch at `time` (now when omitted). With a glide time and a
   * starting frequency, the pitch jumps to `fromFreq` at `time` and glides
   * to `freq` from there, so a glide always starts from the last played
   * pitch rather than from wherever the oscillator happened to be.
   */
  setFrequency(
    freq: number,
    glideTime?: number,
    time?: number,
    fromFreq?: number,
  ): void {
    // A non-finite frequency (bad pitch mod / detune) throws on
    // setValueAtTime and can poison the shared master to silence — ignore it.
    if (!Number.isFinite(freq)) return;
    this.currentFreq = freq;
    const t = time ?? this.ctx.currentTime;
    const glide = glideTime ?? 0;
    const from = fromFreq ?? NaN;
    const glides = glide > 0 && Number.isFinite(from);
    for (const osc of this.oscillators) {
      osc.frequency.cancelScheduledValues(t);
      if (glides) {
        osc.frequency.setValueAtTime(from, t);
        osc.frequency.setTargetAtTime(freq, t, glide / 3);
      } else {
        osc.frequency.setValueAtTime(freq, t);
      }
    }
    // Detune offsets remain applied via osc.detune
  }

  setWaveform(wave: PeriodicWave): void {
    this.currentWave = wave;
    for (const osc of this.oscillators) {
      osc.setPeriodicWave(wave);
    }
  }

  setOscType(type: OscillatorType): void {
    this.currentWave = null;
    this.currentType = type;
    for (const osc of this.oscillators) {
      osc.type = type;
    }
  }

  setVoiceCount(count: number): void {
    if (count === this.voiceCount) return;
    this.voiceCount = Math.max(1, Math.min(16, count));
    if (this.isStarted) {
      // A live edit: the old set fades out while the new one starts now.
      const now = this.ctx.currentTime;
      const old = this.generation;
      if (old) this.scheduleStop(old, now, ANTI_CLICK_TIME);
      this.buildGeneration(now);
    }
  }

  setDetune(spread: number): void {
    this.detuneSpread = spread;
    this.recalculateDetune();
  }

  setBlend(blend: number): void {
    this.blend = blend;
    this.recalculateGains();
  }

  setPitchBendCents(cents: number, time?: number): void {
    this.pitchBendCents = cents;
    this.recalculateDetune(time);
  }

  setStereoSpread(spread: number): void {
    this.stereoSpread = spread;
    this.recalculatePan();
  }

  connectVibratoSource(source: AudioNode): void {
    this.vibratoSource = source;
    for (const osc of this.oscillators) {
      source.connect(osc.detune);
    }
  }

  /**
   * Second detune input for the modulation matrix. Same fan-out/rewire
   * behavior as the vibrato source, kept as a separate slot so vibrato
   * and matrix modulation can coexist.
   */
  connectDetuneModSource(source: AudioNode): void {
    this.detuneModSource = source;
    for (const osc of this.oscillators) {
      source.connect(osc.detune);
    }
  }

  disconnectVibratoSource(): void {
    if (this.vibratoSource) {
      for (const osc of this.oscillators) {
        try {
          this.vibratoSource.disconnect(osc.detune);
        } catch {
          /* already disconnected */
        }
      }
      this.vibratoSource = null;
    }
  }

  getOutputNode(): AudioNode {
    return this.output;
  }

  /** The oscillators of the current generation (empty when stopped). */
  private get oscillators(): OscillatorNode[] {
    return this.generation?.oscillators ?? [];
  }

  private get gains(): GainNode[] {
    return this.generation?.gains ?? [];
  }

  private get panners(): StereoPannerNode[] {
    return this.generation?.panners ?? [];
  }

  private buildGeneration(time: number): void {
    const gen: UnisonGeneration = {
      oscillators: [],
      gains: [],
      panners: [],
      stopAt: Infinity,
      onEnded: null,
    };
    const gainTargets = this.gainTargets();
    const panTargets = this.panTargets();
    for (let i = 0; i < this.voiceCount; i++) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const panner = this.ctx.createStereoPanner();

      osc.frequency.value = this.currentFreq;
      if (this.currentWave) {
        osc.setPeriodicWave(this.currentWave);
      } else {
        osc.type = this.currentType;
      }
      // Created at their targets: only later edits are smoothed, so a note
      // never starts with a 20 ms swell from unity gain.
      gain.gain.value = gainTargets[i];
      panner.pan.value = panTargets[i];

      osc.connect(gain);
      gain.connect(panner);
      panner.connect(this.output);
      if (this.vibratoSource) this.vibratoSource.connect(osc.detune);
      if (this.detuneModSource) this.detuneModSource.connect(osc.detune);
      osc.start(time);

      gen.oscillators.push(osc);
      gen.gains.push(gain);
      gen.panners.push(panner);
    }
    gen.oscillators[0].onended = () => this.teardown(gen);
    this.generation = gen;
    this.recalculateDetune();
  }

  /**
   * Schedules a generation's end at `time`, optionally fading its unison
   * gains to 0 over `fade` seconds first (live edits that replace a set
   * while it sounds). A stop that is already earlier stays.
   */
  private scheduleStop(gen: UnisonGeneration, time: number, fade = 0): void {
    const end = time + fade;
    if (end >= gen.stopAt) return;
    gen.stopAt = end;
    if (fade > 0) {
      for (const gain of gen.gains) {
        gain.gain.cancelScheduledValues(time);
        gain.gain.setValueAtTime(gain.gain.value, time);
        gain.gain.linearRampToValueAtTime(0, end);
      }
    }
    for (const osc of gen.oscillators) {
      try {
        osc.stop(end);
      } catch {
        // Already stopped
      }
    }
  }

  private teardown(gen: UnisonGeneration): void {
    for (const osc of gen.oscillators) {
      osc.onended = null;
      osc.disconnect();
      // Also sever INCOMING edges into osc.detune — without this, the
      // persistent vibrato/detune-mod buses pin every ended oscillator
      // (a connected node cannot be GC'd), leaking nodes on every note-on.
      if (this.vibratoSource) {
        try {
          this.vibratoSource.disconnect(osc.detune);
        } catch {
          /* already disconnected */
        }
      }
      if (this.detuneModSource) {
        try {
          this.detuneModSource.disconnect(osc.detune);
        } catch {
          /* already disconnected */
        }
      }
    }
    for (const gain of gen.gains) gain.disconnect();
    for (const pan of gen.panners) pan.disconnect();
    if (this.generation === gen) this.generation = null;
    const done = gen.onEnded;
    gen.onEnded = null;
    done?.();
  }

  private gainTargets(): number[] {
    const count = this.voiceCount;
    if (count === 1) return [1];
    const centerIndex = Math.floor(count / 2);
    // Normalize total amplitude to avoid volume boost from unison
    const totalGain = 1 / Math.sqrt(count);
    const targets: number[] = [];
    for (let i = 0; i < count; i++) {
      targets.push(
        i === centerIndex
          ? // Center voice: louder when blend is low
            totalGain * (1 + (1 - this.blend) * 0.5)
          : // Detuned voices: louder when blend is high
            totalGain * (0.5 + this.blend * 0.5),
      );
    }
    return targets;
  }

  private panTargets(): number[] {
    const count = this.voiceCount;
    if (count === 1) return [0];
    const targets: number[] = [];
    for (let i = 0; i < count; i++) {
      const t = i / (count - 1); // 0..1
      targets.push((t - 0.5) * 2 * this.stereoSpread); // -1..+1 scaled
    }
    return targets;
  }

  private recalculateDetune(time?: number): void {
    const count = this.oscillators.length;
    const spread = this.detuneSpread;

    for (let i = 0; i < count; i++) {
      let detune = this.pitchBendCents;
      if (count > 1) {
        // Symmetric distribution: -spread/2 to +spread/2
        const t = i / (count - 1); // 0..1
        detune += (t - 0.5) * spread;
      }
      const param = this.oscillators[i].detune;
      if (time === undefined) {
        param.value = detune;
      } else {
        param.setValueAtTime(detune, time);
      }
    }
  }

  private recalculateGains(): void {
    const targets = this.gainTargets();
    const gains = this.gains;
    for (let i = 0; i < gains.length && i < targets.length; i++) {
      smoothParam(gains[i].gain, targets[i], this.ctx, 0.02);
    }
  }

  private recalculatePan(): void {
    const targets = this.panTargets();
    const panners = this.panners;
    for (let i = 0; i < panners.length && i < targets.length; i++) {
      smoothParam(panners[i].pan, targets[i], this.ctx, 0.02);
    }
  }
}
