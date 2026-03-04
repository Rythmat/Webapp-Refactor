import { OscillatorParams } from './types';
import { midiToFrequency, smoothParam } from './constants';
import { UnisonEngine } from './UnisonEngine';
import { WavetableBank } from './WavetableBank';

/**
 * Wavetable oscillator with position morphing and unison.
 *
 * Uses two UnisonEngines (A/B) for wavetable crossfading:
 * when WT POS changes, one engine plays the frame below and
 * the other plays the frame above, with gains crossfading between them.
 */
export class Oscillator {
  private ctx: AudioContext;
  private wavetableBank: WavetableBank;

  // Dual unison engines for wavetable crossfade
  private unisonA: UnisonEngine;
  private unisonB: UnisonEngine;
  private gainA: GainNode;
  private gainB: GainNode;

  // Output chain
  private levelGain: GainNode;
  private panNode: StereoPannerNode;

  private params: OscillatorParams;
  private currentNote: number = 60;
  private isStarted: boolean = false;

  // Track current wavetable frame indices to avoid redundant updates
  private currentSlotA: number = -1;
  private currentSlotB: number = -1;

  constructor(
    ctx: AudioContext,
    wavetableBank: WavetableBank,
    destination: AudioNode
  ) {
    this.ctx = ctx;
    this.wavetableBank = wavetableBank;

    this.params = {
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
    };

    // Output chain: levelGain -> panNode -> destination
    this.levelGain = ctx.createGain();
    this.levelGain.gain.value = this.params.level;

    this.panNode = ctx.createStereoPanner();
    this.panNode.pan.value = this.params.pan;

    this.levelGain.connect(this.panNode);
    this.panNode.connect(destination);

    // Crossfade gains for wavetable morphing
    this.gainA = ctx.createGain();
    this.gainA.gain.value = 1;
    this.gainA.connect(this.levelGain);

    this.gainB = ctx.createGain();
    this.gainB.gain.value = 0;
    this.gainB.connect(this.levelGain);

    // Unison engines
    this.unisonA = new UnisonEngine(ctx, this.gainA);
    this.unisonB = new UnisonEngine(ctx, this.gainB);
  }

  start(): void {
    if (this.isStarted) return;
    this.isStarted = true;

    this.unisonA.setVoiceCount(this.params.unisonVoices);
    this.unisonB.setVoiceCount(this.params.unisonVoices);
    this.unisonA.setDetune(this.params.unisonDetune * 100); // 0..1 → 0..100 cents
    this.unisonB.setDetune(this.params.unisonDetune * 100);
    this.unisonA.setBlend(this.params.unisonBlend);
    this.unisonB.setBlend(this.params.unisonBlend);

    this.unisonA.start();
    this.unisonB.start();

    this.applyWavetablePosition();
  }

  stop(): void {
    if (!this.isStarted) return;
    this.isStarted = false;
    this.unisonA.stop();
    this.unisonB.stop();
    this.currentSlotA = -1;
    this.currentSlotB = -1;
  }

  setFrequency(midiNote: number, glideTime?: number): void {
    this.currentNote = midiNote;
    const baseFreq = midiToFrequency(midiNote);
    const tuningOffset =
      this.params.octave * 12 + this.params.semitone + this.params.fine / 100;
    const freq = baseFreq * Math.pow(2, tuningOffset / 12);

    this.unisonA.setFrequency(freq, glideTime);
    this.unisonB.setFrequency(freq, glideTime);
  }

  setParams(params: Partial<OscillatorParams>): void {
    let needsFreqUpdate = false;
    let needsWavetableUpdate = false;

    if (params.waveform !== undefined) {
      this.params.waveform = params.waveform;
      // Auto-map basic waveform to wavetable only if wavetable isn't also being set
      if (params.wavetable === undefined) {
        const waveformToTable: Record<string, string> = {
          sine: 'SINE WAVE',
          sawtooth: 'SAWTOOTH',
          triangle: 'TRIANGLE',
          square: 'SQUARE',
        };
        const tableName = waveformToTable[params.waveform];
        if (tableName && tableName !== this.params.wavetable) {
          this.params.wavetable = tableName;
          needsWavetableUpdate = true;
        }
      }
    }
    if (params.wavetable !== undefined && params.wavetable !== this.params.wavetable) {
      this.params.wavetable = params.wavetable;
      needsWavetableUpdate = true;
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
    if (params.wtPosition !== undefined) {
      this.params.wtPosition = params.wtPosition;
      needsWavetableUpdate = true;
    }
    if (params.level !== undefined) {
      this.params.level = params.level;
      smoothParam(this.levelGain.gain, params.level, this.ctx);
    }
    if (params.pan !== undefined) {
      this.params.pan = params.pan;
      smoothParam(this.panNode.pan, params.pan, this.ctx);
    }
    if (params.unisonVoices !== undefined) {
      this.params.unisonVoices = params.unisonVoices;
      this.unisonA.setVoiceCount(params.unisonVoices);
      this.unisonB.setVoiceCount(params.unisonVoices);
    }
    if (params.unisonDetune !== undefined) {
      this.params.unisonDetune = params.unisonDetune;
      const cents = params.unisonDetune * 100;
      this.unisonA.setDetune(cents);
      this.unisonB.setDetune(cents);
    }
    if (params.unisonBlend !== undefined) {
      this.params.unisonBlend = params.unisonBlend;
      this.unisonA.setBlend(params.unisonBlend);
      this.unisonB.setBlend(params.unisonBlend);
    }
    if (params.enabled !== undefined) this.params.enabled = params.enabled;

    if (needsFreqUpdate && this.currentNote >= 0) {
      this.setFrequency(this.currentNote);
    }
    if (needsWavetableUpdate && this.isStarted) {
      this.applyWavetablePosition();
    }
  }

  private applyWavetablePosition(): void {
    const pair = this.wavetableBank.getInterpolationPair(
      this.params.wavetable,
      this.params.wtPosition
    );

    if (!pair) {
      // Fallback: use basic oscillator type
      this.unisonA.setOscType(this.params.waveform as OscillatorType);
      this.unisonB.setOscType(this.params.waveform as OscillatorType);
      return;
    }

    // Only update waveforms when the frame index actually changes
    const tableSize = this.wavetableBank.getTableSize(this.params.wavetable);
    const scaledPos = this.params.wtPosition * (tableSize - 1);
    const slotA = Math.floor(scaledPos);
    const slotB = Math.min(slotA + 1, tableSize - 1);

    if (slotA !== this.currentSlotA) {
      this.unisonA.setWaveform(pair.waveA);
      this.currentSlotA = slotA;
    }
    if (slotB !== this.currentSlotB) {
      this.unisonB.setWaveform(pair.waveB);
      this.currentSlotB = slotB;
    }

    // Crossfade between A and B
    const now = this.ctx.currentTime;
    this.gainA.gain.setTargetAtTime(1 - pair.mix, now, 0.005);
    this.gainB.gain.setTargetAtTime(pair.mix, now, 0.005);
  }

  getEnabled(): boolean {
    return this.params.enabled;
  }

  getOutputNode(): AudioNode {
    return this.panNode;
  }

  getGainParam(): AudioParam {
    return this.levelGain.gain;
  }

  setPitchBendCents(cents: number): void {
    this.unisonA.setPitchBendCents(cents);
    this.unisonB.setPitchBendCents(cents);
  }

  connectVibratoSource(source: AudioNode): void {
    this.unisonA.connectVibratoSource(source);
    this.unisonB.connectVibratoSource(source);
  }

  disconnectVibratoSource(): void {
    this.unisonA.disconnectVibratoSource();
    this.unisonB.disconnectVibratoSource();
  }

  connectToAnalyser(node: AudioNode): void {
    this.panNode.connect(node);
  }
}
