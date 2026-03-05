import { smoothParam } from './constants';

/**
 * Multi-voice unison engine. Creates N detuned oscillators with
 * symmetric detune spread and stereo pan distribution.
 * Blend control crossfades between center voice and detuned sum.
 */
export class UnisonEngine {
  private ctx: AudioContext;
  private oscillators: OscillatorNode[] = [];
  private gains: GainNode[] = [];
  private panners: StereoPannerNode[] = [];
  private output: GainNode;

  private voiceCount: number = 1;
  private detuneSpread: number = 0; // total spread in cents
  private pitchBendCents: number = 0;
  private blend: number = 0.1; // 0 = only center, 1 = only detuned
  private stereoSpread: number = 1; // how wide the pan field is
  private currentFreq: number = 440;
  private currentWave: PeriodicWave | null = null;
  private isStarted: boolean = false;
  private vibratoSource: AudioNode | null = null;

  constructor(ctx: AudioContext, destination: AudioNode) {
    this.ctx = ctx;
    this.output = ctx.createGain();
    this.output.gain.value = 1;
    this.output.connect(destination);
  }

  start(): void {
    if (this.isStarted) return;
    this.isStarted = true;
    this.rebuildOscillators();
  }

  stop(): void {
    if (!this.isStarted) return;
    this.isStarted = false;
    this.destroyOscillators();
  }

  setFrequency(freq: number, glideTime?: number): void {
    this.currentFreq = freq;
    for (const osc of this.oscillators) {
      if (glideTime && glideTime > 0) {
        osc.frequency.setTargetAtTime(
          freq,
          this.ctx.currentTime,
          glideTime / 3,
        );
      } else {
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
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
    for (const osc of this.oscillators) {
      osc.type = type;
    }
  }

  setVoiceCount(count: number): void {
    if (count === this.voiceCount) return;
    this.voiceCount = Math.max(1, Math.min(16, count));
    if (this.isStarted) {
      this.rebuildOscillators();
    }
  }

  setDetune(spread: number): void {
    this.detuneSpread = spread;
    if (this.isStarted) {
      this.recalculateDetune();
    }
  }

  setBlend(blend: number): void {
    this.blend = blend;
    if (this.isStarted) {
      this.recalculateGains();
    }
  }

  setPitchBendCents(cents: number): void {
    this.pitchBendCents = cents;
    if (this.isStarted) {
      this.recalculateDetune();
    }
  }

  setStereoSpread(spread: number): void {
    this.stereoSpread = spread;
    if (this.isStarted) {
      this.recalculatePan();
    }
  }

  connectVibratoSource(source: AudioNode): void {
    this.vibratoSource = source;
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

  private rebuildOscillators(): void {
    this.destroyOscillators();

    for (let i = 0; i < this.voiceCount; i++) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const panner = this.ctx.createStereoPanner();

      osc.frequency.value = this.currentFreq;

      if (this.currentWave) {
        osc.setPeriodicWave(this.currentWave);
      }

      osc.connect(gain);
      gain.connect(panner);
      panner.connect(this.output);
      osc.start();

      this.oscillators.push(osc);
      this.gains.push(gain);
      this.panners.push(panner);
    }

    this.recalculateDetune();
    this.recalculateGains();
    this.recalculatePan();

    if (this.vibratoSource) {
      for (const osc of this.oscillators) {
        this.vibratoSource.connect(osc.detune);
      }
    }
  }

  private destroyOscillators(): void {
    for (const osc of this.oscillators) {
      try {
        osc.stop();
      } catch {
        // Already stopped
      }
      osc.disconnect();
    }
    for (const gain of this.gains) gain.disconnect();
    for (const pan of this.panners) pan.disconnect();
    this.oscillators = [];
    this.gains = [];
    this.panners = [];
  }

  private recalculateDetune(): void {
    const count = this.voiceCount;
    const spread = this.detuneSpread;

    for (let i = 0; i < count; i++) {
      let detune = this.pitchBendCents;
      if (count > 1) {
        // Symmetric distribution: -spread/2 to +spread/2
        const t = i / (count - 1); // 0..1
        detune += (t - 0.5) * spread;
      }
      this.oscillators[i].detune.value = detune;
    }
  }

  private recalculateGains(): void {
    const count = this.voiceCount;
    if (count === 1) {
      this.gains[0].gain.value = 1;
      return;
    }

    const centerIndex = Math.floor(count / 2);
    // Normalize total amplitude to avoid volume boost from unison
    const totalGain = 1 / Math.sqrt(count);

    for (let i = 0; i < count; i++) {
      if (i === centerIndex) {
        // Center voice: louder when blend is low
        const centerGain = totalGain * (1 + (1 - this.blend) * 0.5);
        smoothParam(this.gains[i].gain, centerGain, this.ctx, 0.02);
      } else {
        // Detuned voices: louder when blend is high
        const detuneGain = totalGain * (0.5 + this.blend * 0.5);
        smoothParam(this.gains[i].gain, detuneGain, this.ctx, 0.02);
      }
    }
  }

  private recalculatePan(): void {
    const count = this.voiceCount;
    for (let i = 0; i < count; i++) {
      if (count === 1) {
        this.panners[i].pan.value = 0;
      } else {
        const t = i / (count - 1); // 0..1
        const pan = (t - 0.5) * 2 * this.stereoSpread; // -1..+1 scaled
        smoothParam(this.panners[i].pan, pan, this.ctx, 0.02);
      }
    }
  }
}
