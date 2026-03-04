// ── VocalFxAdapter ──────────────────────────────────────────────────────────
// InstrumentAdapter for vocal tracks. Routes live audio input through
// GuitarPedalChain (shared pedal processing, including pitch correction)
// into the track's audio graph.
//
// Signal chain (mono):
//   MediaStreamSource → ChannelSplitter → channelGain(1ch) → PedalChain → muteGain → track

import type { InstrumentAdapter } from './InstrumentAdapter';
import { GuitarPedalChain } from '@/daw/audio/GuitarPedalChain';
import type { PedalBlockDescriptor } from '@/daw/audio/pedals/PedalProcessor';
import { PitchCorrectionPedal } from '@/daw/audio/pedals/PitchCorrectionPedal';
import type { PitchInfo } from '@/daw/audio/pitch-correction/PitchCorrectionNode';

export type ChannelConfig =
  | { mode: 'mono'; channel: number }
  | { mode: 'stereo'; left: number; right: number };

export class VocalFxAdapter implements InstrumentAdapter {
  private _ctx: AudioContext | null = null;
  private nativeCtx: AudioContext | null = null;
  private _outputNode: AudioNode | null = null;
  private pedalChain: GuitarPedalChain | null = null;

  // Audio input
  private stream: MediaStream | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private splitterNode: ChannelSplitterNode | null = null;
  private channelGain: GainNode | null = null;
  private mergerNode: ChannelMergerNode | null = null;

  // Metering
  private analyserNode: AnalyserNode | null = null;
  private rmsBuffer: Float32Array | null = null;

  // State
  private deviceId: string | null = null;
  private deviceChCount = 2; // actual device channel count (from capabilities API)
  private channelConfig: ChannelConfig = { mode: 'mono', channel: 0 };
  private monitoringEnabled = false;
  private muteGain: GainNode | null = null;
  private activator: ConstantSourceNode | null = null;
  private recordDest: MediaStreamAudioDestinationNode | null = null;

  // ── InstrumentAdapter interface ──────────────────────────────────────

  async init(ctx: AudioContext, outputNode: AudioNode): Promise<void> {
    this._ctx = ctx;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.nativeCtx = (ctx as any)._nativeContext ?? ctx;
    this._outputNode = outputNode;

    this.pedalChain = new GuitarPedalChain(ctx);

    // Mute gate BEFORE pedal chain — gates live mic input only.
    // Playback audio connects directly to pedalChain input, bypassing muteGain,
    // so monitoring toggle doesn't silence clip playback.
    this.muteGain = this.nativeCtx!.createGain();
    this.muteGain.gain.value = this.monitoringEnabled ? 1 : 0;
    this.muteGain.connect(this.pedalChain.getInputNode());

    // Cross-context bridge to wrapped outputNode
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.activator = (ctx as any).createConstantSource();
    this.activator!.offset.value = 0;
    this.activator!.start();
    this.activator!.connect(outputNode);

    // Pedal chain output → track output directly (no mute gate on this path)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nativeOutput = (outputNode as any)._nativeAudioNode ?? outputNode;
    this.pedalChain.getOutputNode().connect(nativeOutput);

    // Input analyser (before pedal chain, on raw input)
    this.analyserNode = this.nativeCtx!.createAnalyser();
    this.analyserNode.fftSize = 256;
    this.analyserNode.smoothingTimeConstant = 0;
    this.rmsBuffer = new Float32Array(this.analyserNode.fftSize);
  }

  // No-ops for audio input tracks (not MIDI-driven)
  noteOn(): void {}
  noteOff(): void {}
  allNotesOff(): void {}
  panic(): void {}

  dispose(): void {
    this.stopRecordingStream();
    this.stopStream();
    this.pedalChain?.dispose();
    this.muteGain?.disconnect();
    this.analyserNode?.disconnect();
    if (this.activator) {
      try { this.activator.stop(); } catch { /* may already be stopped */ }
      try { this.activator.disconnect(); } catch { /* may already be disconnected */ }
      this.activator = null;
    }
    this.pedalChain = null;
    this.muteGain = null;
    this.analyserNode = null;
    this._ctx = null;
    this.nativeCtx = null;
    this._outputNode = null;
  }

  // ── Audio input management ─────────────────────────────────────────

  async setDevice(deviceId: string | null, deviceChannelCount?: number): Promise<void> {
    if (deviceId === this.deviceId) return;
    this.deviceId = deviceId;

    this.stopStream();

    if (!deviceId || !this.nativeCtx || !this.pedalChain) return;

    if (this.nativeCtx.state === 'suspended') {
      await this.nativeCtx.resume();
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: { exact: deviceId },
          channelCount: { ideal: 32 },
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });
      this.stream = stream;

      const track = stream.getAudioTracks()[0];
      if (track) {
        track.addEventListener('ended', () => {
          console.warn('[VocalFxAdapter] Audio input track ended (device disconnected?)');
          this.stopStream();
        });
      }

      this.sourceNode = this.nativeCtx.createMediaStreamSource(stream);

      // Use device capability count (sourceNode.channelCount only reflects browser-granted channels)
      this.deviceChCount = deviceChannelCount ?? this.sourceNode.channelCount;
      this.splitterNode = this.nativeCtx.createChannelSplitter(Math.max(2, this.deviceChCount));
      this.sourceNode.connect(this.splitterNode);

      this.channelGain = this.nativeCtx.createGain();

      this.connectChannelRouting();
      this.channelGain.connect(this.analyserNode!);
      this.channelGain.connect(this.muteGain!);
    } catch (err) {
      console.warn('[VocalFxAdapter] Failed to open audio input:', err);
      this.stopStream();
    }
  }

  setChannelConfig(config: ChannelConfig): void {
    if (
      (config.mode === 'mono' && this.channelConfig.mode === 'mono' && config.channel === this.channelConfig.channel) ||
      (config.mode === 'stereo' && this.channelConfig.mode === 'stereo' &&
        config.left === (this.channelConfig as { left: number }).left &&
        config.right === (this.channelConfig as { right: number }).right)
    ) return;

    this.channelConfig = config;

    if (!this.splitterNode || !this.channelGain || !this.sourceNode) return;

    this.disconnectChannelRouting();
    this.connectChannelRouting();
  }

  getChannelConfig(): ChannelConfig {
    return this.channelConfig;
  }

  getDeviceId(): string | null {
    return this.deviceId;
  }

  setMonitoring(enabled: boolean): void {
    this.monitoringEnabled = enabled;
    if (this.muteGain) {
      this.muteGain.gain.value = enabled ? 1 : 0;
    }
  }

  getInputLevel(): number {
    if (!this.analyserNode || !this.rmsBuffer) return 0;
    this.analyserNode.getFloatTimeDomainData(this.rmsBuffer as Float32Array<ArrayBuffer>);
    let sum = 0;
    for (let i = 0; i < this.rmsBuffer.length; i++) {
      sum += this.rmsBuffer[i] * this.rmsBuffer[i];
    }
    return Math.sqrt(sum / this.rmsBuffer.length);
  }

  getChannelCount(): number {
    return this.deviceChCount;
  }

  // ── Pedal chain sync ──────────────────────────────────────────────────

  syncChain(blocks: PedalBlockDescriptor[]): void {
    this.pedalChain?.syncChain(blocks);
  }

  /** Fast-path param update: skips audio graph rewiring when only params changed. */
  updateChainParams(blocks: PedalBlockDescriptor[]): boolean {
    return this.pedalChain?.updateProcessorParams(blocks) ?? false;
  }

  /** Create a MediaStream from the raw input (before pedal chain) for DRY recording. */
  startRecordingStream(): MediaStream {
    if (!this.recordDest && this.nativeCtx && this.channelGain) {
      this.recordDest = this.nativeCtx.createMediaStreamDestination();
      this.channelGain.connect(this.recordDest);
    }
    return this.recordDest!.stream;
  }

  /** Disconnect the recording tap. */
  stopRecordingStream(): void {
    if (this.recordDest) {
      if (this.channelGain) {
        try { this.channelGain.disconnect(this.recordDest); } catch { /* ok */ }
      }
      this.recordDest = null;
    }
  }

  /** Return the native pedal chain input node for routing playback audio. */
  getNativePedalInputNode(): AudioNode | null {
    return this.pedalChain?.getInputNode() ?? null;
  }

  // ── Pitch info (finds pitch-correction processor in chain) ────────────

  getPitchInfo(): PitchInfo | null {
    const proc = this.findPitchCorrectionPedal();
    return proc?.getPitchInfo() ?? null;
  }

  onPitchUpdate(cb: ((info: PitchInfo) => void) | null): void {
    const proc = this.findPitchCorrectionPedal();
    proc?.onPitchUpdate(cb);
  }

  private findPitchCorrectionPedal(): PitchCorrectionPedal | null {
    // Access the internal processors array via the chain's syncChain tracking
    // We search by checking the type field
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const processors = (this.pedalChain as any)?.processors as Array<{ type: string }> | undefined;
    if (!processors) return null;
    const found = processors.find((p) => p.type === 'pitch-correction');
    return found ? (found as unknown as PitchCorrectionPedal) : null;
  }

  // ── Private ────────────────────────────────────────────────────────

  private connectChannelRouting(): void {
    if (!this.nativeCtx || !this.splitterNode || !this.channelGain || !this.sourceNode) return;

    const channelCount = this.deviceChCount;

    if (this.channelConfig.mode === 'stereo') {
      const left = Math.min(this.channelConfig.left, channelCount - 1);
      const right = Math.min(this.channelConfig.right, channelCount - 1);

      this.channelGain.channelCount = 2;
      this.channelGain.channelCountMode = 'explicit';

      this.mergerNode = this.nativeCtx.createChannelMerger(2);
      this.splitterNode.connect(this.mergerNode, left, 0);
      this.splitterNode.connect(this.mergerNode, right, 1);
      this.mergerNode.connect(this.channelGain);
    } else {
      const ch = Math.min(this.channelConfig.channel, channelCount - 1);

      this.channelGain.channelCount = 1;
      this.channelGain.channelCountMode = 'explicit';

      this.splitterNode.connect(this.channelGain, ch);
    }
  }

  private disconnectChannelRouting(): void {
    if (this.mergerNode) {
      this.mergerNode.disconnect();
      this.mergerNode = null;
    }
    if (this.splitterNode && this.channelGain) {
      try { this.splitterNode.disconnect(this.channelGain); } catch { /* not connected */ }
    }
  }

  private stopStream(): void {
    this.disconnectChannelRouting();
    if (this.channelGain) {
      this.channelGain.disconnect();
      this.channelGain = null;
    }
    if (this.splitterNode) {
      this.splitterNode.disconnect();
      this.splitterNode = null;
    }
    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
    }
  }
}
