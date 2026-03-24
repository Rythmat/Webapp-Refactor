import type { InstrumentAdapter } from '../instruments/InstrumentAdapter';
import { EffectChain, type TrackEffectState } from './EffectChain';

export class TrackEngine {
  private instrument: InstrumentAdapter | null = null;
  private gainNode: GainNode;
  private pannerNode: StereoPannerNode;
  private effectChain: EffectChain;
  private analyserNode: AnalyserNode;

  constructor(ctx: AudioContext, destination: AudioNode) {
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

  dispose(): void {
    this.instrument?.dispose();
    this.effectChain.dispose();
    this.gainNode.disconnect();
    this.pannerNode.disconnect();
    this.analyserNode.disconnect();
  }
}
