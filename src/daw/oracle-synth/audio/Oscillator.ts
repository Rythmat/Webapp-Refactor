import { OscillatorParams } from './types';
import { midiToFrequency, smoothParam } from './constants';
import { UnisonEngine } from './UnisonEngine';
import { WavetableBank } from './WavetableBank';
import { buildWarpCurve, isPhaseWarp } from './wavetableWarp';

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

  // Distortion-family warp: a WaveShaper spliced onto the post-crossfade sum
  // ONLY while a distortion warp is engaged (see applyWarpCurve). When idle the
  // crossfade gains feed levelGain directly — identical to a plain oscillator
  // (a WaveShaper with a null curve does not reliably pass audio, so it must
  // not sit in the signal path unless it's actually shaping).
  private warpNode: WaveShaperNode;
  private warpActive = false;

  // Output chain
  private levelGain: GainNode;
  private panNode: StereoPannerNode;

  // Modulation-matrix detune input (fanned into every unison osc.detune)
  private detuneModBus: GainNode;

  private params: OscillatorParams;
  private currentNote: number = 60;
  private isStarted: boolean = false;

  // Track current wavetable frame indices to avoid redundant updates
  private currentSlotA: number = -1;
  private currentSlotB: number = -1;

  constructor(
    ctx: AudioContext,
    wavetableBank: WavetableBank,
    destination: AudioNode,
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
      warpMode: 'none',
      warpAmount: 0,
      enabled: true,
    };

    // Output chain: levelGain -> panNode -> destination
    this.levelGain = ctx.createGain();
    this.levelGain.gain.value = this.params.level;

    this.panNode = ctx.createStereoPanner();
    this.panNode.pan.value = this.params.pan;

    this.levelGain.connect(this.panNode);
    this.panNode.connect(destination);

    // Warp shaper: output pre-wired to levelGain, but no input until a
    // distortion warp is engaged. Idle, it contributes nothing.
    this.warpNode = ctx.createWaveShaper();
    this.warpNode.connect(this.levelGain);

    // Crossfade gains for wavetable morphing → levelGain directly (dry path,
    // rerouted through warpNode by applyWarpCurve only while warping).
    this.gainA = ctx.createGain();
    this.gainA.gain.value = 1;
    this.gainA.connect(this.levelGain);

    this.gainB = ctx.createGain();
    this.gainB.gain.value = 0;
    this.gainB.connect(this.levelGain);

    // Unison engines
    this.unisonA = new UnisonEngine(ctx, this.gainA);
    this.unisonB = new UnisonEngine(ctx, this.gainB);

    // Persistent detune mod bus — engines rewire it on oscillator rebuild
    this.detuneModBus = ctx.createGain();
    this.detuneModBus.gain.value = 1;
    this.unisonA.connectDetuneModSource(this.detuneModBus);
    this.unisonB.connectDetuneModSource(this.detuneModBus);
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
    let needsWarpCurve = false;

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
    if (
      params.wavetable !== undefined &&
      params.wavetable !== this.params.wavetable
    ) {
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
    if (
      params.warpMode !== undefined &&
      params.warpMode !== this.params.warpMode
    ) {
      const phaseAffected =
        isPhaseWarp(this.params.warpMode) || isPhaseWarp(params.warpMode);
      this.params.warpMode = params.warpMode;
      needsWarpCurve = true;
      if (phaseAffected) {
        needsWavetableUpdate = true;
        this.currentSlotA = -1;
        this.currentSlotB = -1;
      }
    }
    if (
      params.warpAmount !== undefined &&
      params.warpAmount !== this.params.warpAmount
    ) {
      this.params.warpAmount = params.warpAmount;
      needsWarpCurve = true;
      if (isPhaseWarp(this.params.warpMode)) {
        needsWavetableUpdate = true;
        this.currentSlotA = -1;
        this.currentSlotB = -1;
      }
    }
    if (params.enabled !== undefined) this.params.enabled = params.enabled;

    if (needsWarpCurve) this.applyWarpCurve();
    if (needsFreqUpdate && this.currentNote >= 0) {
      this.setFrequency(this.currentNote);
    }
    if (needsWavetableUpdate && this.isStarted) {
      this.applyWavetablePosition();
    }
  }

  /**
   * Splices the distortion-warp shaper into the signal path when a distortion
   * warp is active, and removes it (restoring the direct dry path) otherwise.
   * `buildWarpCurve` returns non-null only for a distortion mode with a
   * non-zero amount; phase warps and 'none' return null (shaper stays out).
   */
  private applyWarpCurve(): void {
    const curve = buildWarpCurve(this.params.warpMode, this.params.warpAmount);
    if (curve) {
      this.warpNode.curve = curve as Float32Array<ArrayBuffer>;
      this.warpNode.oversample = '4x';
      if (!this.warpActive) {
        // Insert: reroute the crossfade sum through the shaper.
        this.gainA.disconnect(this.levelGain);
        this.gainB.disconnect(this.levelGain);
        this.gainA.connect(this.warpNode);
        this.gainB.connect(this.warpNode);
        this.warpActive = true;
      }
    } else if (this.warpActive) {
      // Remove: restore the direct dry path.
      this.gainA.disconnect(this.warpNode);
      this.gainB.disconnect(this.warpNode);
      this.gainA.connect(this.levelGain);
      this.gainB.connect(this.levelGain);
      this.warpActive = false;
    }
  }

  /** Base table, or a lazily-built phase-warped variant when active. */
  private effectiveTableName(): string {
    if (this.params.warpAmount > 0.001 && isPhaseWarp(this.params.warpMode)) {
      return this.wavetableBank.resolveWarpedTable(
        this.params.wavetable,
        this.params.warpMode,
        this.params.warpAmount,
      );
    }
    return this.params.wavetable;
  }

  private applyWavetablePosition(): void {
    const table = this.effectiveTableName();
    const pair = this.wavetableBank.getInterpolationPair(
      table,
      this.params.wtPosition,
    );

    if (!pair) {
      // Fallback: basic oscillator type while an imported table is still
      // loading. Reset the slot cache and crossfade so that once the table
      // resolves, the NEXT call is forced to re-apply the real frames to BOTH
      // unison engines — otherwise a coinciding frame index skips one engine
      // via the slot-equality guard below and leaves it stuck on this
      // fallback sawtooth, layered under the loaded preset's wavetable.
      this.unisonA.setOscType(this.params.waveform as OscillatorType);
      this.unisonB.setOscType(this.params.waveform as OscillatorType);
      this.currentSlotA = -1;
      this.currentSlotB = -1;
      const now = this.ctx.currentTime;
      this.gainA.gain.setTargetAtTime(1, now, 0.005);
      this.gainB.gain.setTargetAtTime(0, now, 0.005);
      return;
    }

    // Only update waveforms when the frame index actually changes
    const tableSize = this.wavetableBank.getTableSize(table);
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

  getPanParam(): AudioParam {
    return this.panNode.pan;
  }

  /** Re-resolves the current wavetable — called after an imported table
   *  finishes loading so a sounding oscillator swaps off the fallback. */
  reapplyWavetable(): void {
    this.currentSlotA = -1;
    this.currentSlotB = -1;
    if (this.isStarted) {
      this.applyWavetablePosition();
    }
  }

  /** Modulation-matrix detune input: connect a scaler here (cents). */
  getDetuneModInput(): GainNode {
    return this.detuneModBus;
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
