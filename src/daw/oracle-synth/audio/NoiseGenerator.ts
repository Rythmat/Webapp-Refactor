import { NoiseParams } from './types';
import { smoothParam } from './constants';
import { seededRandom } from './seededRandom';

/** Fixed seeds: every voice and every render gets the same noise samples. */
const WHITE_SEED = 0x5eed01;
const PINK_SEED = 0x5eed02;

interface NoiseBuffers {
  white: AudioBuffer;
  pink: AudioBuffer;
}

// One pair of buffers per context: they are identical anyway (seeded), and
// building 2 s of noise for every lazily created voice costs a few ms each.
const bufferCache = new WeakMap<object, NoiseBuffers>();

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
  /** Context time the current source stops at (Infinity while held). */
  private stopAt: number = Infinity;
  private onEnded: (() => void) | null = null;

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

  /** Starts a new looping source at `time` (now when omitted). */
  start(time?: number): void {
    if (this.isStarted) return;
    const t = time ?? this.ctx.currentTime;
    if (this.source && this.stopAt > t) this.scheduleStop(this.source, t);
    this.isStarted = true;
    this.createSource(t);
  }

  /**
   * Stops the source at `time` (now when omitted), or moves an earlier
   * scheduled stop; onended disconnects it and calls `onEnded`. Returns
   * false when there was nothing to stop.
   */
  stop(time?: number, onEnded?: () => void): boolean {
    this.isStarted = false;
    if (!this.source) return false;
    if (onEnded) this.onEnded = onEnded;
    this.scheduleStop(this.source, time ?? this.ctx.currentTime);
    return true;
  }

  private scheduleStop(source: AudioBufferSourceNode, time: number): void {
    if (time >= this.stopAt) return;
    this.stopAt = time;
    try {
      source.stop(time);
    } catch {
      // Already stopped
    }
  }

  private teardown(source: AudioBufferSourceNode): void {
    source.onended = null;
    source.disconnect();
    if (this.source === source) {
      this.source = null;
      const done = this.onEnded;
      this.onEnded = null;
      done?.();
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

  getPanParam(): AudioParam {
    return this.panNode.pan;
  }

  connectToAnalyser(dest: AudioNode): void {
    this.gainNode.connect(dest);
  }

  private createSource(time: number): void {
    const buffer =
      this.params.type === 'pink' ? this.pinkBuffer : this.whiteBuffer;
    if (!buffer) return;

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.connect(this.gainNode);
    source.onended = () => this.teardown(source);
    source.start(time);
    this.source = source;
    this.stopAt = Infinity;
    this.onEnded = null;
  }

  private generateBuffers(): void {
    const cached = bufferCache.get(this.ctx);
    if (cached) {
      this.whiteBuffer = cached.white;
      this.pinkBuffer = cached.pink;
      return;
    }
    const sampleRate = this.ctx.sampleRate;
    const length = sampleRate * 2; // 2 seconds of noise

    this.whiteBuffer = this.generateWhiteNoise(length, sampleRate);
    this.pinkBuffer = this.generatePinkNoise(length, sampleRate);
    bufferCache.set(this.ctx, {
      white: this.whiteBuffer,
      pink: this.pinkBuffer,
    });
  }

  private generateWhiteNoise(length: number, sampleRate: number): AudioBuffer {
    const buffer = this.ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    const random = seededRandom(WHITE_SEED);
    for (let i = 0; i < length; i++) {
      data[i] = random() * 2 - 1;
    }
    return buffer;
  }

  private generatePinkNoise(length: number, sampleRate: number): AudioBuffer {
    const buffer = this.ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    // Voss-McCartney algorithm
    const random = seededRandom(PINK_SEED);
    let b0 = 0,
      b1 = 0,
      b2 = 0,
      b3 = 0,
      b4 = 0,
      b5 = 0,
      b6 = 0;

    for (let i = 0; i < length; i++) {
      const white = random() * 2 - 1;
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
