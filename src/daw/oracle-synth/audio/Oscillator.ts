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
/** The note a key-tracking-off oscillator plays at: middle C. */
const FIXED_PITCH_NOTE = 60;

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
  /**
   * Whether bank B runs this note. It only ever sounds between two frames,
   * so a note on a one-frame table (the basic waves) leaves it off: half the
   * oscillators (audit 2026-10-21). It starts with A, so the two stay in
   * phase; a table change mid-note to a multi-frame one starts it late.
   */
  private bankBStarted = false;

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

  /** Starts this note's unison oscillators at `time` (now when omitted). */
  start(time?: number): void {
    if (this.isStarted) return;
    this.isStarted = true;

    this.unisonA.setVoiceCount(this.params.unisonVoices);
    this.unisonB.setVoiceCount(this.params.unisonVoices);
    this.unisonA.setDetune(this.params.unisonDetune * 100); // 0..1 → 0..100 cents
    this.unisonB.setDetune(this.params.unisonDetune * 100);
    this.unisonA.setBlend(this.params.unisonBlend);
    this.unisonB.setBlend(this.params.unisonBlend);

    this.unisonA.start(time);
    // 0 frames: a pack table still loading, which may have many.
    if (this.wavetableBank.getTableSize(this.effectiveTableName()) !== 1) {
      this.unisonB.start(time);
      this.bankBStarted = true;
    }

    this.applyWavetablePosition();
  }

  /**
   * Stops the oscillators at `time` (now when omitted), or moves an earlier
   * scheduled stop; `onEnded` runs once they have ended. Returns false when
   * there was nothing to stop.
   */
  stop(time?: number, onEnded?: () => void): boolean {
    if (this.isStarted) {
      this.isStarted = false;
      this.currentSlotA = -1;
      this.currentSlotB = -1;
    }
    // A set already in its tail can still be moved earlier (a voice steal).
    const running = this.unisonA.stop(time, onEnded);
    // B too when it sat this note out: a steal can move its last tail.
    this.unisonB.stop(time);
    this.bankBStarted = false;
    return running;
  }

  private noteToFrequency(midiNote: number): number {
    // Key tracking off: the oscillator plays its pitch from middle C,
    // whatever the key (a Serum kick or tom's fixed pitch).
    if (this.params.keyTrack === false) midiNote = FIXED_PITCH_NOTE;
    const tuningOffset =
      this.params.octave * 12 + this.params.semitone + this.params.fine / 100;
    return midiToFrequency(midiNote) * Math.pow(2, tuningOffset / 12);
  }

  /**
   * Sets the pitch at `time` (now when omitted). With a glide time and
   * `fromNote`, it glides from that note's pitch starting at `time`.
   */
  setFrequency(
    midiNote: number,
    glideTime?: number,
    time?: number,
    fromNote?: number,
  ): void {
    this.currentNote = midiNote;
    const freq = this.noteToFrequency(midiNote);
    const fromFreq =
      fromNote !== undefined && fromNote >= 0
        ? this.noteToFrequency(fromNote)
        : undefined;

    this.unisonA.setFrequency(freq, glideTime, time, fromFreq);
    this.unisonB.setFrequency(freq, glideTime, time, fromFreq);
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
          // A new table: its frames go in even where the index matches.
          this.currentSlotA = -1;
          this.currentSlotB = -1;
        }
      }
    }
    if (
      params.wavetable !== undefined &&
      params.wavetable !== this.params.wavetable
    ) {
      this.params.wavetable = params.wavetable;
      needsWavetableUpdate = true;
      // A held note switches table even where the frame index matches (a
      // one-frame table to another, Position 0): the slot guard kept the
      // old table sounding (audit 2026-10-21).
      this.currentSlotA = -1;
      this.currentSlotB = -1;
    }
    // A patch push sends the whole oscillator: only what changed is applied
    // (a re-sent pitch would re-pitch every voice and cut a glide short).
    if (params.octave !== undefined && params.octave !== this.params.octave) {
      this.params.octave = params.octave;
      needsFreqUpdate = true;
    }
    if (
      params.keyTrack !== undefined &&
      params.keyTrack !== this.params.keyTrack
    ) {
      this.params.keyTrack = params.keyTrack;
      needsFreqUpdate = true;
    }
    if (
      params.semitone !== undefined &&
      params.semitone !== this.params.semitone
    ) {
      this.params.semitone = params.semitone;
      needsFreqUpdate = true;
    }
    if (params.fine !== undefined && params.fine !== this.params.fine) {
      this.params.fine = params.fine;
      needsFreqUpdate = true;
    }
    if (params.wtPosition !== undefined) {
      this.params.wtPosition = params.wtPosition;
      needsWavetableUpdate = true;
    }
    if (params.level !== undefined && params.level !== this.params.level) {
      this.params.level = params.level;
      smoothParam(this.levelGain.gain, params.level, this.ctx);
    }
    if (params.pan !== undefined && params.pan !== this.params.pan) {
      this.params.pan = params.pan;
      smoothParam(this.panNode.pan, params.pan, this.ctx);
    }
    if (params.unisonVoices !== undefined) {
      this.params.unisonVoices = params.unisonVoices;
      this.unisonA.setVoiceCount(params.unisonVoices);
      this.unisonB.setVoiceCount(params.unisonVoices);
    }
    if (
      params.unisonDetune !== undefined &&
      params.unisonDetune !== this.params.unisonDetune
    ) {
      this.params.unisonDetune = params.unisonDetune;
      const cents = params.unisonDetune * 100;
      this.unisonA.setDetune(cents);
      this.unisonB.setDetune(cents);
    }
    if (
      params.unisonBlend !== undefined &&
      params.unisonBlend !== this.params.unisonBlend
    ) {
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
    // A one-frame table (a basic shape): Position is where in the cycle
    // the note starts. It is set as the note starts (the slot is cleared on
    // stop), so a knob turn or modulation never jumps a sounding note's
    // phase, which would click.
    if (tableSize === 1) {
      if (this.currentSlotA !== 0) {
        this.unisonA.setWaveform(
          this.wavetableBank.getPhasedWave(table, this.params.wtPosition) ??
            pair.waveA,
        );
        this.currentSlotA = 0;
      }
      const now = this.ctx.currentTime;
      this.gainA.gain.setTargetAtTime(1, now, 0.005);
      this.gainB.gain.setTargetAtTime(0, now, 0.005);
      return;
    }
    if (this.isStarted && !this.bankBStarted && tableSize > 1) {
      this.unisonB.start();
      this.bankBStarted = true;
      this.currentSlotB = -1;
    }
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

  setPitchBendCents(cents: number, time?: number): void {
    this.unisonA.setPitchBendCents(cents, time);
    this.unisonB.setPitchBendCents(cents, time);
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
