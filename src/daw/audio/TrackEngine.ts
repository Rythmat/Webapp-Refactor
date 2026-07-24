import type { InstrumentAdapter } from '../instruments/InstrumentAdapter';
import { EffectChain, type TrackEffectState } from './EffectChain';

export class TrackEngine {
  private ctx: AudioContext;
  private instrument: InstrumentAdapter | null = null;
  private gainNode: GainNode;
  private pannerNode: StereoPannerNode;
  private effectChain: EffectChain;
  private analyserNode: AnalyserNode;
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

    this.analyserNode = ctx.createAnalyser();
    this.analyserNode.fftSize = 256;
    this.analyserNode.smoothingTimeConstant = 0;

    // Signal chain: instrument → gainNode → effectChain → pannerNode → destination
    this.gainNode.connect(this.effectChain.getInputNode());
    this.effectChain.getOutputNode().connect(this.pannerNode);
    this.pannerNode.connect(destination);

    // Parallel metering tap (dead-end branch — does not alter signal path)
    this.pannerNode.connect(this.analyserNode);

    // Start gate polling loop
    this.effectChain.startGateLoop();
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

  allNotesOff(): void {
    this.instrument?.allNotesOff();
  }

  panic(): void {
    this.instrument?.panic();
  }

  setVolume(vol: number): void {
    if (!Number.isFinite(vol)) return;
    this.gainNode.gain.value = Math.max(0, Math.min(2, vol));
  }

  setPan(pan: number): void {
    if (!Number.isFinite(pan)) return;
    this.pannerNode.pan.value = Math.max(-1, Math.min(1, pan));
  }

  updateEffects(state: TrackEffectState): void {
    this.effectChain.update(state);
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

  /** Wire the ducker's key-source lookup (resolves a key track's analyser by
   *  id). Injected by the playback engine from its track registry. */
  setKeySourceResolver(fn: (trackId: string) => AnalyserNode | null): void {
    this.effectChain.setKeySourceResolver(fn);
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
  setSend(returnId: string, level: number, busInput: AudioNode | null): void {
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
    entry.gain.gain.value = value;
  }

  dispose(): void {
    this.instrument?.dispose();
    this.effectChain.dispose();
    this.gainNode.disconnect();
    this.pannerNode.disconnect();
    this.analyserNode.disconnect();
    for (const { gain } of this.sends.values()) gain.disconnect();
    this.sends.clear();
  }
}
