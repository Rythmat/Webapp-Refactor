import { SubOscillatorParams } from './types';
import { midiToFrequency, smoothParam } from './constants';

/**
 * Sub oscillator — a simple single-oscillator source
 * locked 1 or 2 octaves below the main oscillators.
 */
export class SubOscillator {
  private ctx: AudioContext;
  private osc: OscillatorNode | null = null;
  private gainNode: GainNode;
  private panNode: StereoPannerNode;
  private params: SubOscillatorParams;
  private currentNote: number = 60;
  private isStarted: boolean = false;
  /** Context time the current oscillator stops at (Infinity while held). */
  private stopAt: number = Infinity;
  private onEnded: (() => void) | null = null;
  private vibratoSource: AudioNode | null = null;
  private pitchBendCents: number = 0;

  // Modulation-matrix detune input (reconnected each start())
  private detuneModBus: GainNode;

  constructor(ctx: AudioContext, destination: AudioNode) {
    this.ctx = ctx;
    this.detuneModBus = ctx.createGain();
    this.detuneModBus.gain.value = 1;

    this.params = {
      waveform: 'sine',
      octave: -1,
      semitone: 0,
      fine: 0,
      level: 0.5,
      pan: 0,
      enabled: false,
    };

    this.gainNode = ctx.createGain();
    this.gainNode.gain.value = this.params.level;

    this.panNode = ctx.createStereoPanner();
    this.panNode.pan.value = this.params.pan;

    this.gainNode.connect(this.panNode);
    this.panNode.connect(destination);
  }

  /** Starts a new oscillator at `time` (now when omitted). */
  start(time?: number): void {
    if (this.isStarted) return;
    const t = time ?? this.ctx.currentTime;
    // A previous oscillator still in its tail stops where this one starts.
    if (this.osc && this.stopAt > t) this.scheduleStop(this.osc, t);
    this.isStarted = true;
    const osc = this.ctx.createOscillator();
    osc.type = this.params.waveform;
    osc.frequency.value = this.noteFrequency(this.currentNote);
    osc.connect(this.gainNode);
    osc.detune.value = this.pitchBendCents;
    if (this.vibratoSource) {
      this.vibratoSource.connect(osc.detune);
    }
    this.detuneModBus.connect(osc.detune);
    osc.onended = () => this.teardown(osc);
    osc.start(t);
    this.osc = osc;
    this.stopAt = Infinity;
    this.onEnded = null;
  }

  /**
   * Stops the oscillator at `time` (now when omitted), or moves an earlier
   * scheduled stop. It stays the current oscillator until it ends, then
   * onended disconnects it and calls `onEnded`. Returns false when there was
   * nothing to stop.
   */
  stop(time?: number, onEnded?: () => void): boolean {
    this.isStarted = false;
    if (!this.osc) return false;
    if (onEnded) this.onEnded = onEnded;
    this.scheduleStop(this.osc, time ?? this.ctx.currentTime);
    return true;
  }

  private scheduleStop(osc: OscillatorNode, time: number): void {
    if (time >= this.stopAt) return;
    this.stopAt = time;
    try {
      osc.stop(time);
    } catch {
      // Already stopped
    }
  }

  private teardown(osc: OscillatorNode): void {
    osc.onended = null;
    osc.disconnect();
    // Sever incoming edges into osc.detune so the persistent buses don't
    // pin the ended oscillator (one leaked node per note otherwise)
    try {
      this.detuneModBus.disconnect(osc.detune);
    } catch {
      /* already disconnected */
    }
    if (this.vibratoSource) {
      try {
        this.vibratoSource.disconnect(osc.detune);
      } catch {
        /* already disconnected */
      }
    }
    if (this.osc === osc) {
      this.osc = null;
      const done = this.onEnded;
      this.onEnded = null;
      done?.();
    }
  }

  private noteFrequency(midiNote: number): number {
    const tuningOffset =
      this.params.octave * 12 + this.params.semitone + this.params.fine / 100;
    return midiToFrequency(midiNote) * Math.pow(2, tuningOffset / 12);
  }

  /**
   * Sets the pitch at `time` (now when omitted); with a glide time and
   * `fromNote` it glides from that note's pitch starting at `time`.
   */
  setFrequency(
    midiNote: number,
    glideTime?: number,
    time?: number,
    fromNote?: number,
  ): void {
    this.currentNote = midiNote;
    if (!this.osc) return;

    const freq = this.noteFrequency(midiNote);
    const t = time ?? this.ctx.currentTime;
    const param = this.osc.frequency;
    param.cancelScheduledValues(t);
    if (glideTime && glideTime > 0 && fromNote !== undefined && fromNote >= 0) {
      param.setValueAtTime(this.noteFrequency(fromNote), t);
      param.setTargetAtTime(freq, t, glideTime / 3);
    } else {
      param.setValueAtTime(freq, t);
    }
  }

  setParams(params: Partial<SubOscillatorParams>): void {
    let needsFreqUpdate = false;

    if (params.waveform !== undefined) {
      this.params.waveform = params.waveform;
      if (this.osc) {
        this.osc.type = params.waveform as OscillatorType;
      }
    }
    if (params.octave !== undefined) {
      this.params.octave = params.octave;
      needsFreqUpdate = true;
    }
    if (params.semitone !== undefined) {
      this.params.semitone = params.semitone;
      needsFreqUpdate = true;
    }
    if (params.fine !== undefined) {
      this.params.fine = params.fine;
      needsFreqUpdate = true;
    }
    if (params.level !== undefined) {
      this.params.level = params.level;
      smoothParam(this.gainNode.gain, params.level, this.ctx);
    }
    if (params.pan !== undefined) {
      this.params.pan = params.pan;
      smoothParam(this.panNode.pan, params.pan, this.ctx);
    }
    if (params.enabled !== undefined) {
      this.params.enabled = params.enabled;
    }

    if (needsFreqUpdate) {
      this.updateFrequency();
    }
  }

  private updateFrequency(): void {
    if (this.currentNote >= 0) {
      this.setFrequency(this.currentNote);
    }
  }

  getEnabled(): boolean {
    return this.params.enabled;
  }

  setPitchBendCents(cents: number, time?: number): void {
    this.pitchBendCents = cents;
    if (this.osc) {
      if (time === undefined) {
        this.osc.detune.value = cents;
      } else {
        this.osc.detune.setValueAtTime(cents, time);
      }
    }
  }

  connectVibratoSource(source: AudioNode): void {
    this.vibratoSource = source;
    if (this.osc) {
      source.connect(this.osc.detune);
    }
  }

  disconnectVibratoSource(): void {
    if (this.vibratoSource && this.osc) {
      try {
        this.vibratoSource.disconnect(this.osc.detune);
      } catch {
        /* already disconnected */
      }
    }
    this.vibratoSource = null;
  }

  getGainParam(): AudioParam {
    return this.gainNode.gain;
  }

  getPanParam(): AudioParam {
    return this.panNode.pan;
  }

  /** Modulation-matrix detune input: connect a scaler here (cents). */
  getDetuneModInput(): GainNode {
    return this.detuneModBus;
  }
}
