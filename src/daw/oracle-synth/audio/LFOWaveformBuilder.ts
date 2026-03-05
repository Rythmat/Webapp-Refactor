import { LFONode } from './types';

/**
 * Converts LFO node breakpoint arrays into AudioBuffer sample data.
 * Each bar is an array of {time: 0..1, value: 0..1} nodes.
 * Linear interpolation between nodes produces the continuous waveform.
 */
export class LFOWaveformBuilder {
  /**
   * Build a single-bar waveform buffer from breakpoint nodes.
   * Nodes span the full bar (time 0..1 = one musical bar).
   * @param nodes Sorted array of {time, value} breakpoints
   * @param samplesPerBar Number of samples for the full bar
   * @returns Float32Array of sample values (0..1)
   */
  static buildBar(
    nodes: LFONode[],
    samplesPerBar: number,
    smooth: number = 0,
  ): Float32Array {
    const buffer = new Float32Array(samplesPerBar);

    if (nodes.length === 0) {
      return buffer; // silence
    }

    if (nodes.length === 1) {
      buffer.fill(nodes[0].value);
      return buffer;
    }

    // Ensure nodes are sorted by time
    const sorted = [...nodes].sort((a, b) => a.time - b.time);

    for (let i = 0; i < samplesPerBar; i++) {
      const t = i / samplesPerBar; // 0..1 across the whole bar

      // Find the right segment in sorted nodes
      let nodeIdx = 0;
      while (nodeIdx < sorted.length - 2 && sorted[nodeIdx + 1].time <= t) {
        nodeIdx++;
      }

      const a = sorted[nodeIdx];
      const b = sorted[Math.min(nodeIdx + 1, sorted.length - 1)];

      if (a.time === b.time) {
        buffer[i] = a.value;
      } else {
        const frac = (t - a.time) / (b.time - a.time);
        const c = a.curve ?? 0;
        const shaped = c === 0 ? frac : Math.pow(frac, Math.pow(2, -c * 2));
        buffer[i] = a.value + (b.value - a.value) * shaped;
      }
    }

    // Apply smoothing: forward-backward one-pole IIR filter (zero-phase).
    // At smooth=0 no filtering; at smooth=1 heavy filtering (triangle → sine).
    if (smooth > 0) {
      const alpha = Math.exp(-smooth * 6);
      const coeff = 1 - alpha;
      // Forward pass
      for (let i = 1; i < samplesPerBar; i++) {
        buffer[i] = alpha * buffer[i] + coeff * buffer[i - 1];
      }
      // Backward pass
      for (let i = samplesPerBar - 2; i >= 0; i--) {
        buffer[i] = alpha * buffer[i] + coeff * buffer[i + 1];
      }
    }

    return buffer;
  }

  /**
   * Build a complete 4-bar AudioBuffer from bar node arrays.
   * Each bar's nodes span time 0..1 = one musical bar. No tiling — nodes
   * directly define the full waveform shape including all peaks.
   * @param bars Array of 4 bar node arrays
   * @param barDurations Duration in seconds for each bar (one musical bar each)
   * @returns AudioBuffer containing the concatenated waveform
   */
  static buildBuffer(
    ctx: AudioContext,
    bars: [LFONode[], LFONode[], LFONode[], LFONode[]],
    barDurations: [number, number, number, number],
    smooths: [number, number, number, number] = [0, 0, 0, 0],
  ): AudioBuffer {
    const sampleRate = ctx.sampleRate;
    const barSamples = barDurations.map((d) =>
      Math.max(1, Math.round(sampleRate * d)),
    );
    const totalSamples =
      barSamples[0] + barSamples[1] + barSamples[2] + barSamples[3];

    const buffer = ctx.createBuffer(1, totalSamples, sampleRate);
    const data = buffer.getChannelData(0);

    let offset = 0;
    for (let bar = 0; bar < 4; bar++) {
      const barData = this.buildBar(bars[bar], barSamples[bar], smooths[bar]);
      data.set(barData, offset);
      offset += barSamples[bar];
    }

    return buffer;
  }

  /**
   * Generate preset node arrays for common LFO shapes.
   * When repeats > 1, generates multiple cycles spanning the full bar (time 0..1).
   * Each peak is independently editable by the user after generation.
   * @param shape Waveform shape preset
   * @param repeats Number of complete cycles to fit within the bar (default 1)
   */
  static presetNodes(
    shape: 'triangle' | 'sine' | 'square' | 'sawtooth' | 'ramp',
    repeats: number = 1,
  ): LFONode[] {
    const r = Math.max(1, Math.round(repeats));

    // Generate a single cycle of the shape (time 0..1, value 0..1)
    const singleCycle = (shape: string): LFONode[] => {
      switch (shape) {
        case 'triangle':
          return [
            { time: 0, value: 0 },
            { time: 0.5, value: 1 },
            { time: 1, value: 0 },
          ];
        case 'sine': {
          // Approximate sine with 9 points per cycle
          const pts: LFONode[] = [];
          for (let i = 0; i <= 8; i++) {
            pts.push({
              time: i / 8,
              value: (Math.sin((i / 8) * Math.PI * 2 - Math.PI / 2) + 1) / 2,
            });
          }
          return pts;
        }
        case 'square':
          return [
            { time: 0, value: 1 },
            { time: 0.499, value: 1 },
            { time: 0.5, value: 0 },
            { time: 0.999, value: 0 },
            { time: 1, value: 1 },
          ];
        case 'sawtooth':
          return [
            { time: 0, value: 0 },
            { time: 0.999, value: 1 },
            { time: 1, value: 0 },
          ];
        case 'ramp':
          return [
            { time: 0, value: 1 },
            { time: 0.999, value: 0 },
            { time: 1, value: 1 },
          ];
        default:
          return [
            { time: 0, value: 0 },
            { time: 1, value: 0 },
          ];
      }
    };

    if (r === 1) {
      return singleCycle(shape);
    }

    // Tile single cycle into r repetitions across time 0..1
    const cycle = singleCycle(shape);
    const nodes: LFONode[] = [];
    const cycleWidth = 1 / r;

    for (let k = 0; k < r; k++) {
      const offset = k * cycleWidth;
      for (let i = 0; i < cycle.length; i++) {
        const t = offset + cycle[i].time * cycleWidth;
        // Skip duplicate points at cycle boundaries (last of prev = first of next)
        if (k > 0 && i === 0) continue;
        nodes.push({ time: Math.min(1, t), value: cycle[i].value });
      }
    }

    return nodes;
  }
}
