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
  private vibratoSource: AudioNode | null = null;
  private pitchBendCents: number = 0;

  constructor(ctx: AudioContext, destination: AudioNode) {
    this.ctx = ctx;

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

  start(): void {
    if (this.isStarted) return;
    this.isStarted = true;
    this.osc = this.ctx.createOscillator();
    this.osc.type = this.params.waveform;
    this.osc.connect(this.gainNode);
    this.osc.detune.value = this.pitchBendCents;
    if (this.vibratoSource) {
      this.vibratoSource.connect(this.osc.detune);
    }
    this.osc.start();
    this.updateFrequency();
  }

  stop(): void {
    if (!this.isStarted) return;
    this.isStarted = false;
    if (this.osc) {
      try {
        this.osc.stop();
      } catch {
        // Already stopped
      }
      this.osc.disconnect();
      this.osc = null;
    }
  }

  setFrequency(midiNote: number, glideTime?: number): void {
    this.currentNote = midiNote;
    if (!this.osc) return;

    const tuningOffset =
      this.params.octave * 12 + this.params.semitone + this.params.fine / 100;
    const freq = midiToFrequency(midiNote) * Math.pow(2, tuningOffset / 12);

    if (glideTime && glideTime > 0) {
      this.osc.frequency.setTargetAtTime(
        freq,
        this.ctx.currentTime,
        glideTime / 3
      );
    } else {
      this.osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
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

  setPitchBendCents(cents: number): void {
    this.pitchBendCents = cents;
    if (this.osc) {
      this.osc.detune.value = cents;
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
      try { this.vibratoSource.disconnect(this.osc.detune); } catch { /* already disconnected */ }
    }
    this.vibratoSource = null;
  }

  getGainParam(): AudioParam {
    return this.gainNode.gain;
  }
}
