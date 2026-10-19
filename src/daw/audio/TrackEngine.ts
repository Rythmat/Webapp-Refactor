import type { InstrumentAdapter } from '../instruments/InstrumentAdapter';
import {
  EffectChain,
  PARAM_GLIDE_S,
  type TrackEffectState,
} from './EffectChain';
import { createMeterTap } from './meterTap';

export class TrackEngine {
  private ctx: AudioContext;
  private instrument: InstrumentAdapter | null = null;
  private gainNode: GainNode;
  private pannerNode: StereoPannerNode;
  private effectChain: EffectChain;
  // Mute/solo gate: post-FX, pre-pan, so it silences the main out, the aux
  // sends and the meter together.
  private audibleGain: GainNode;
  private analyserNode: AnalyserNode;
  // The meters' own tap (meterTap.ts); analyserNode is the post-fader tap a
  // ducker on another track takes as its key (it passes the sound through).
  private meterAnalyser: AnalyserNode;
  // Post-fader aux sends: pannerNode → sendGain → returnBus input, keyed by
  // return id. `bus` is remembered so a return recreated with a new input node
  // gets rewired instead of silently feeding the stale one.
  private sends = new Map<string, { gain: GainNode; bus: AudioNode }>();

  constructor(ctx: AudioContext, destination: AudioNode) {
    this.ctx = ctx;
    this.gainNode = ctx.createGain();
    this.gainNode.channelCount = 2;
    this.gainNode.channelCountMode = 'explicit';
    this.gainNode.channelInterpretation = 'speakers';
    this.pannerNode = ctx.createStereoPanner();
    this.effectChain = new EffectChain(ctx);
    this.audibleGain = ctx.createGain();

    this.analyserNode = ctx.createAnalyser();
    this.analyserNode.fftSize = 256;
    this.analyserNode.smoothingTimeConstant = 0;
    this.meterAnalyser = createMeterTap(ctx);

    // Signal chain: instrument → gainNode → effectChain → audibleGain → pannerNode → destination
    this.gainNode.connect(this.effectChain.getInputNode());
    this.effectChain.getOutputNode().connect(this.audibleGain);
    this.audibleGain.connect(this.pannerNode);
    this.pannerNode.connect(destination);

    // Parallel metering tap (dead-end branch — does not alter signal path)
    this.pannerNode.connect(this.analyserNode);
    this.pannerNode.connect(this.meterAnalyser);
  }

  getInputNode(): AudioNode {
    return this.gainNode;
  }

  /** Return the native (unwrapped) gain node for connecting native AudioNodes. */
  getNativeInputNode(): AudioNode {
    // standardized-audio-context wraps native nodes under _nativeAudioNode
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (this.gainNode as any)._nativeAudioNode ?? this.gainNode;
  }

  getAnalyserNode(): AnalyserNode {
    return this.analyserNode;
  }

  /** The track's meter tap, read by the meter bus. */
  getMeterAnalyser(): AnalyserNode {
    return this.meterAnalyser;
  }

  getEffectChain(): EffectChain {
    return this.effectChain;
  }

  setInstrument(adapter: InstrumentAdapter): void {
    this.instrument = adapter;
  }

  getInstrument(): InstrumentAdapter | null {
    return this.instrument;
  }

  noteOn(note: number, velocity: number, time?: number): void {
    this.instrument?.noteOn(note, velocity, time);
  }

  noteOff(note: number, time?: number): void {
    this.instrument?.noteOff(note, time);
  }

  cc(controller: number, value: number, time?: number): void {
    this.instrument?.cc?.(controller, value, time);
  }

  pitchBend(value: number, time?: number): void {
    this.instrument?.pitchBend?.(value, time);
  }

  allNotesOff(time?: number): void {
    this.instrument?.allNotesOff(time);
  }

  panic(time?: number): void {
    this.instrument?.panic(time);
  }

  /** Sets a parameter: at once, or gliding for a change heard while it
   *  plays (a drag's preview, an edit to a live track). */
  private setParam(param: AudioParam, value: number, glide: boolean): void {
    if (glide)
      param.setTargetAtTime(value, this.ctx.currentTime, PARAM_GLIDE_S);
    else param.value = value;
  }

  setVolume(vol: number, glide = false): void {
    if (!Number.isFinite(vol)) return;
    this.setParam(this.gainNode.gain, Math.max(0, Math.min(2, vol)), glide);
  }

  /** Mute/solo gate (see isTrackAudible). Ramps over a few ms so toggling
   *  mid-note doesn't click. */
  setAudible(audible: boolean): void {
    this.audibleGain.gain.setTargetAtTime(
      audible ? 1 : 0,
      this.ctx.currentTime,
      0.005,
    );
  }

  setPan(pan: number, glide = false): void {
    if (!Number.isFinite(pan)) return;
    this.setParam(this.pannerNode.pan, Math.max(-1, Math.min(1, pan)), glide);
  }

  updateEffects(
    state: TrackEffectState,
    opts?: { glide?: boolean; deferIr?: boolean },
  ): void {
    this.effectChain.update(state, opts);
  }

  // ── Automation seam (Phase 7) ──
  // Expose the underlying AudioParams so the AutomationScheduler can ride them
  // with setValueAtTime / linearRampToValueAtTime. These are the SAME params the
  // static setters write, so a lane and a fader address one target.

  /** Track volume AudioParam (pre-FX gain). */
  getVolumeParam(): AudioParam {
    return this.gainNode.gain;
  }

  /** Track pan AudioParam. */
  getPanParam(): AudioParam {
    return this.pannerNode.pan;
  }

  /** A post-fader send's level AudioParam, or null until the send is wired
   *  (setSend creates the gain node lazily — always call setSend first). */
  getSendParam(returnId: string): AudioParam | null {
    return this.sends.get(returnId)?.gain.gain ?? null;
  }

  /** Wire the ducker's key-source lookup (resolves a key track's post-fader
   *  tap by id). Injected by the playback engine from its track registry. */
  setKeySourceResolver(fn: (trackId: string) => AnalyserNode | null): void {
    this.effectChain.setKeySourceResolver(fn);
  }

  /** Re-resolves the ducker's key tap, after track engines were made again. */
  refreshDuckerKey(): void {
    this.effectChain.refreshDuckerKey();
  }

  /** Resolves once an enabled gate or ducker is in the path (see EffectChain). */
  whenDynamicsReady(): Promise<void> {
    return this.effectChain.whenDynamicsReady();
  }

  /** Current sidechain gain reduction in dB (≤ 0) for the ducker GR meter. */
  getDuckReduction(): number {
    return this.effectChain.getDuckReduction();
  }

  /**
   * Set a post-fader send level to a return bus. `busInput` is the return's
   * EffectChain input node; pass null to remove the send. Level clamps to
   * 0–1; a level of 0 keeps the (silent) tap wired, so send 0 == exact
   * previous mix — the send contributes nothing until raised.
   */
  setSend(
    returnId: string,
    level: number,
    busInput: AudioNode | null,
    glide = false,
  ): void {
    const entry = this.sends.get(returnId);
    if (!busInput) {
      if (entry) {
        // Tear down BOTH edges (pannerNode→gain and gain→bus) so the gain node
        // is fully detached and collectable, not just its output.
        this.pannerNode.disconnect(entry.gain);
        entry.gain.disconnect();
        this.sends.delete(returnId);
      }
      return;
    }
    const value = Number.isFinite(level) ? Math.max(0, Math.min(1, level)) : 0;
    if (!entry) {
      const gain = this.ctx.createGain();
      gain.gain.value = value;
      this.pannerNode.connect(gain);
      gain.connect(busInput);
      this.sends.set(returnId, { gain, bus: busInput });
      return;
    }
    if (entry.bus !== busInput) {
      entry.gain.disconnect();
      entry.gain.connect(busInput);
      entry.bus = busInput;
    }
    this.setParam(entry.gain.gain, value, glide);
  }

  dispose(): void {
    this.instrument?.dispose();
    this.effectChain.dispose();
    this.gainNode.disconnect();
    this.audibleGain.disconnect();
    this.pannerNode.disconnect();
    this.analyserNode.disconnect();
    this.meterAnalyser.disconnect();
    for (const { gain } of this.sends.values()) gain.disconnect();
    this.sends.clear();
  }
}
