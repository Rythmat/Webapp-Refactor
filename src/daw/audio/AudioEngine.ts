import * as Tone from 'tone';
import { EffectChain, type TrackEffectState } from './EffectChain';

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private analyserL: AnalyserNode | null = null;
  private analyserR: AnalyserNode | null = null;
  private masteringChain: EffectChain | null = null;
  // Global aux return buses (Phase 4): each is its own EffectChain →
  // returnGain (fader) → masterGain. Tracks tap them via post-fader sends.
  // Fixed id set for now ('A' reverb, 'B' delay); returns are not per-track
  // creatable. Mirrors the masteringChain wiring.
  private returnBuses = new Map<string, EffectChain>();
  private returnGains = new Map<string, GainNode>();
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

    // Return buses: returnChain → returnGain → masterGain. Track sends feed
    // the chain input. Effect state + volume are applied from the store by
    // usePlaybackEngine (like tracks + mastering).
    for (const id of ['A', 'B']) {
      const chain = new EffectChain(this.ctx);
      const gain = this.ctx.createGain();
      gain.gain.value = 0.8;
      chain.getOutputNode().connect(gain);
      gain.connect(this.masterGain);
      chain.startGateLoop();
      this.returnBuses.set(id, chain);
      this.returnGains.set(id, gain);
    }

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
    //
    // Built on the NATIVE context, not Tone's standardized-audio-context wrapper.
    // The input adapters create their monitorSend tap on the native context
    // (wrapped nodes can't connect to native ones), so the bus must be native too
    // — otherwise the tap → bus connect throws "Overload resolution failed" and
    // the outgoing WebRTC stream carries silence.
    const nativeCtx =
      (this.ctx as unknown as { _nativeContext?: AudioContext })
        ._nativeContext ?? this.ctx;
    this.monitorBus = nativeCtx.createGain();
    this.monitorDest = nativeCtx.createMediaStreamDestination();
    this.monitorBus.connect(this.monitorDest);

    // Sync Tone.js Transport PPQ with our engine's 480 ticks per quarter note
    Tone.getTransport().PPQ = 480;

    // Auto-resume watchdog: the shared context can be suspended (OS sleep, tab
    // backgrounding, Chrome inactivity) or 'interrupted' (iOS — call, other-app
    // audio, headphone/Bluetooth route change), which freezes the clock and
    // drops ALL Studio audio with no recovery but reload. Re-resume on state
    // change and when the tab becomes visible again. Nothing in the app ever
    // intentionally suspends, so unconditional resume is safe.
    this.ctx.onstatechange = () => {
      if (this.ctx && this.ctx.state !== 'running') {
        void this.ctx.resume().catch(() => {});
      }
    };
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.handleVisibility);
    }

    this.isInitialized = true;
  }

  private handleVisibility = (): void => {
    if (document.visibilityState === 'visible') void this.resumeIfNeeded();
  };

  /** Resume the shared context if it's not running (call on transport play and
   *  any live note entry point). No-op when already running. */
  async resumeIfNeeded(): Promise<void> {
    if (this.ctx && this.ctx.state !== 'running') {
      try {
        await this.ctx.resume();
      } catch {
        /* resume can reject if there's no user gesture yet — ignore */
      }
    }
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

  /** The return bus's EffectChain input node — track sends connect here. */
  getReturnBusInput(id: string): AudioNode | null {
    return this.returnBuses.get(id)?.getInputNode() ?? null;
  }

  getReturnIds(): string[] {
    return Array.from(this.returnBuses.keys());
  }

  updateReturnEffects(id: string, state: TrackEffectState): void {
    this.returnBuses.get(id)?.update(state);
  }

  setReturnVolume(id: string, volume: number): void {
    const gain = this.returnGains.get(id);
    if (gain) {
      // Ramp like the master fader to avoid zipper noise on drags.
      gain.gain.setTargetAtTime(
        Math.max(0, Math.min(1, volume)),
        gain.context.currentTime,
        0.01,
      );
    }
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
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.handleVisibility);
    }
    if (this.ctx) this.ctx.onstatechange = null;
    this.masteringChain?.stopGateLoop();
    this.masteringChain?.dispose();
    for (const chain of this.returnBuses.values()) {
      chain.stopGateLoop();
      chain.dispose();
    }
    for (const gain of this.returnGains.values()) gain.disconnect();
    this.returnBuses.clear();
    this.returnGains.clear();
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
