import { NoiseParams } from './types';
import { smoothParam } from './constants';

/**
 * Noise generator. Generates white or pink noise using pre-computed
 * AudioBuffers that loop continuously.
 * Pink noise uses the Voss-McCartney algorithm.
 */
export class NoiseGenerator {
  private ctx: AudioContext;
  private source: AudioBufferSourceNode | null = null;
  private gainNode: GainNode;
  private panNode: StereoPannerNode;
  private params: NoiseParams;
  private isStarted: boolean = false;

  // Pre-generated buffers
  private whiteBuffer: AudioBuffer | null = null;
  private pinkBuffer: AudioBuffer | null = null;

  constructor(ctx: AudioContext, destination: AudioNode) {
    this.ctx = ctx;

    this.params = {
      type: 'pink',
      level: 0.3,
      pan: 0,
      enabled: false,
    };

    this.gainNode = ctx.createGain();
    this.gainNode.gain.value = this.params.level;

    this.panNode = ctx.createStereoPanner();
    this.panNode.pan.value = this.params.pan;

    this.gainNode.connect(this.panNode);
    this.panNode.connect(destination);

    this.generateBuffers();
  }

  start(): void {
    if (this.isStarted) return;
    this.isStarted = true;
    this.createSource();
  }

  stop(): void {
    if (!this.isStarted) return;
    this.isStarted = false;
    if (this.source) {
      try {
        this.source.stop();
      } catch {
        // Already stopped
      }
      this.source.disconnect();
      this.source = null;
    }
  }

  setParams(params: Partial<NoiseParams>): void {
    let needsRestart = false;

    if (params.type !== undefined && params.type !== this.params.type) {
      this.params.type = params.type;
      needsRestart = this.isStarted;
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

    if (needsRestart) {
      this.stop();
      this.start();
    }
  }

  getEnabled(): boolean {
    return this.params.enabled;
  }

  getGainParam(): AudioParam {
    return this.gainNode.gain;
  }

  connectToAnalyser(dest: AudioNode): void {
    this.gainNode.connect(dest);
  }

  private createSource(): void {
    const buffer =
      this.params.type === 'pink' ? this.pinkBuffer : this.whiteBuffer;
    if (!buffer) return;

    this.source = this.ctx.createBufferSource();
    this.source.buffer = buffer;
    this.source.loop = true;
    this.source.connect(this.gainNode);
    this.source.start();
  }

  private generateBuffers(): void {
    const sampleRate = this.ctx.sampleRate;
    const length = sampleRate * 2; // 2 seconds of noise

    this.whiteBuffer = this.generateWhiteNoise(length, sampleRate);
    this.pinkBuffer = this.generatePinkNoise(length, sampleRate);
  }

  private generateWhiteNoise(length: number, sampleRate: number): AudioBuffer {
    const buffer = this.ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  private generatePinkNoise(length: number, sampleRate: number): AudioBuffer {
    const buffer = this.ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    // Voss-McCartney algorithm
    let b0 = 0,
      b1 = 0,
      b2 = 0,
      b3 = 0,
      b4 = 0,
      b5 = 0,
      b6 = 0;

    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.969 * b2 + white * 0.153852;
      b3 = 0.8665 * b3 + white * 0.3104856;
      b4 = 0.55 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.016898;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }

    return buffer;
  }
}
