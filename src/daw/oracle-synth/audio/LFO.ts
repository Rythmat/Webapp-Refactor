import { LFONode } from './types';
import { LFOWaveformBuilder } from './LFOWaveformBuilder';

/**
 * LFO with 4-bar waveform built from node breakpoints.
 * Each bar represents one musical bar. The waveform tiles within each bar
 * based on the rate (Hz). Total loop = 4 musical bars.
 * Plays as a looping AudioBufferSourceNode.
 * Output range: 0..1 (unipolar)
 *
 * The LFO runs freely (not synced to note events).
 * Modulation depth/routing is handled by ModulationMatrix.
 */
export class LFO {
  private ctx: AudioContext;
  private source: AudioBufferSourceNode | null = null;
  private output: GainNode;

  private bpm: number = 120;
  private bars: [LFONode[], LFONode[], LFONode[], LFONode[]];
  private smooths: [number, number, number, number] = [0, 0, 0, 0];
  private isRunning: boolean = false;

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
    this.output = ctx.createGain();
    this.output.gain.value = 1;

    // Default triangle
    const defaultNodes = LFOWaveformBuilder.presetNodes('triangle');
    this.bars = [
      [...defaultNodes],
      [...defaultNodes],
      [...defaultNodes],
      [...defaultNodes],
    ];
  }

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.createSource();
  }

  stop(): void {
    if (!this.isRunning) return;
    this.isRunning = false;
    this.destroySource();
  }

  setBPM(bpm: number): void {
    this.bpm = Math.max(1, bpm);
    if (this.isRunning) {
      this.destroySource();
      this.createSource();
    }
  }

  setBars(bars: [LFONode[], LFONode[], LFONode[], LFONode[]]): void {
    this.bars = bars;
    if (this.isRunning) {
      this.destroySource();
      this.createSource();
    }
  }

  setBarNodes(barIndex: number, nodes: LFONode[]): void {
    this.bars[barIndex] = nodes;
    if (this.isRunning) {
      this.destroySource();
      this.createSource();
    }
  }

  setBarSmooth(barIndex: number, smooth: number): void {
    this.smooths[barIndex] = smooth;
    if (this.isRunning) {
      this.destroySource();
      this.createSource();
    }
  }

  getOutputNode(): GainNode {
    return this.output;
  }

  private createSource(): void {
    // Each bar = one musical bar duration (4 beats at current BPM)
    const barDuration = 240 / this.bpm;
    const barDurations: [number, number, number, number] = [
      barDuration,
      barDuration,
      barDuration,
      barDuration,
    ];

    // Nodes directly define the full waveform shape (no tiling)
    const buffer = LFOWaveformBuilder.buildBuffer(
      this.ctx,
      this.bars,
      barDurations,
      this.smooths,
    );

    this.source = this.ctx.createBufferSource();
    this.source.buffer = buffer;
    this.source.loop = true;
    this.source.playbackRate.value = 1; // Real-time; durations baked into buffer
    this.source.connect(this.output);
    this.source.start();
  }

  private destroySource(): void {
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
}
