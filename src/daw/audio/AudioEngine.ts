import * as Tone from 'tone';
import { EffectChain, type TrackEffectState } from './EffectChain';

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private analyserL: AnalyserNode | null = null;
  private analyserR: AnalyserNode | null = null;
  private masteringChain: EffectChain | null = null;
  // Live-monitor send bus: a parallel tap that captures this user's LIVE input
  // monitoring (mic / instrument FX) for streaming to collaborators. It is NOT
  // connected to the speakers (the user already hears their own monitor through
  // the normal track path) — only to a MediaStreamDestination for WebRTC.
  private monitorBus: GainNode | null = null;
  private monitorDest: MediaStreamAudioDestinationNode | null = null;
  private isInitialized = false;

  async init(): Promise<void> {
    // Start Tone.js audio context (handles browser autoplay policy)
    await Tone.start();
    this.ctx = Tone.getContext().rawContext as AudioContext;
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.8;

    // Mastering effect chain: masterGain → masteringChain → destination
    this.masteringChain = new EffectChain(this.ctx);
    this.masterGain.connect(this.masteringChain.getInputNode());
    this.masteringChain.getOutputNode().connect(this.ctx.destination);
    this.masteringChain.startGateLoop();

    // Stereo master metering — parallel dead-end tap after mastering chain
    const splitter = this.ctx.createChannelSplitter(2);
    this.masteringChain.getOutputNode().connect(splitter);

    this.analyserL = this.ctx.createAnalyser();
    this.analyserL.fftSize = 256;
    this.analyserL.smoothingTimeConstant = 0;

    this.analyserR = this.ctx.createAnalyser();
    this.analyserR.fftSize = 256;
    this.analyserR.smoothingTimeConstant = 0;

    splitter.connect(this.analyserL, 0);
    splitter.connect(this.analyserR, 1);

    // Live-monitor send bus (for collaborative monitoring). Input adapters tap
    // their monitored output into monitorBus; monitorBus feeds only a
    // MediaStreamDestination, so it never reaches the local speakers.
    this.monitorBus = this.ctx.createGain();
    this.monitorDest = this.ctx.createMediaStreamDestination();
    this.monitorBus.connect(this.monitorDest);

    // Sync Tone.js Transport PPQ with our engine's 480 ticks per quarter note
    Tone.getTransport().PPQ = 480;

    this.isInitialized = true;
  }

  getContext(): AudioContext {
    if (!this.ctx)
      throw new Error('AudioEngine not initialized. Call init() first.');
    return this.ctx;
  }

  getMasterGain(): GainNode {
    if (!this.masterGain)
      throw new Error('AudioEngine not initialized. Call init() first.');
    return this.masterGain;
  }

  getMasterAnalysers(): [AnalyserNode, AnalyserNode] {
    if (!this.analyserL || !this.analyserR)
      throw new Error('AudioEngine not initialized. Call init() first.');
    return [this.analyserL, this.analyserR];
  }

  getMasteringChain(): EffectChain | null {
    return this.masteringChain;
  }

  /** The send-bus node that input adapters tap for collaborative monitoring. */
  getMonitorBus(): GainNode | null {
    return this.monitorBus;
  }

  /** The outgoing MediaStream carrying this user's live input monitor (WebRTC). */
  getMonitorStream(): MediaStream | null {
    return this.monitorDest?.stream ?? null;
  }

  updateMasteringEffects(state: TrackEffectState): void {
    this.masteringChain?.update(state);
  }

  getIsInitialized(): boolean {
    return this.isInitialized;
  }

  getSampleRate(): number {
    return this.ctx?.sampleRate ?? 0;
  }

  getBaseLatency(): number {
    return this.ctx?.baseLatency ?? 0;
  }

  supportsOutputSelection(): boolean {
    return (
      typeof (
        this.ctx as AudioContext & { setSinkId?: (id: string) => Promise<void> }
      )?.setSinkId === 'function'
    );
  }

  async setOutputDevice(deviceId: string): Promise<void> {
    const ctx = this.ctx as
      | (AudioContext & { setSinkId?: (id: string) => Promise<void> })
      | null;
    if (!ctx || typeof ctx.setSinkId !== 'function') {
      console.warn('[AudioEngine] setSinkId not supported in this browser');
      return;
    }
    await ctx.setSinkId(deviceId);
  }

  dispose(): void {
    this.masteringChain?.stopGateLoop();
    this.masteringChain?.dispose();
    this.masterGain?.disconnect();
    this.analyserL?.disconnect();
    this.analyserR?.disconnect();
    this.monitorBus?.disconnect();
    this.monitorBus = null;
    this.monitorDest = null;
    this.isInitialized = false;
  }
}

// Singleton instance
export const audioEngine = new AudioEngine();
