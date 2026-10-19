import { LFONode } from './types';
import { LFOWaveformBuilder } from './LFOWaveformBuilder';

function sameNodes(a: LFONode[] | undefined, b: LFONode[]): boolean {
  if (a === undefined || a.length !== b.length) return false;
  return a.every(
    (n, i) =>
      n.time === b[i].time &&
      n.value === b[i].value &&
      (n.curve ?? 0) === (b[i].curve ?? 0),
  );
}

/** Crossfade between an old and a rebuilt LFO source (seconds). */
const REBUILD_FADE = 0.01;
/** The waveform spans four 4/4 bars. */
const LOOP_BEATS = 16;

interface LfoSource {
  node: AudioBufferSourceNode;
  gain: GainNode;
  startedAt: number;
  fadesIn: boolean;
}

/**
 * LFO with 4-bar waveform built from node breakpoints.
 * Each bar represents one musical bar. The waveform tiles within each bar
 * based on the rate (Hz). Total loop = 4 musical bars.
 * Plays as a looping AudioBufferSourceNode.
 * Output range: 0..1 (unipolar)
 *
 * Phase: the loop's position is anchored to a context time (`anchorTime`,
 * where the loop is at `anchorFrac`). It starts at 0 when the LFO starts;
 * alignToBeat re-anchors it to the song's bars (call it on play, loop and
 * seek), and a rebuild after an edit or a BPM change starts the new buffer
 * at the phase the old one had (start(when, offset)) with a short crossfade,
 * instead of jumping back to the start of bar 1.
 * Modulation depth/routing is handled by ModulationMatrix.
 */
export class LFO {
  private ctx: AudioContext;
  private source: LfoSource | null = null;
  private output: GainNode;

  private bpm: number = 120;
  private bars: [LFONode[], LFONode[], LFONode[], LFONode[]];
  private smooths: [number, number, number, number] = [0, 0, 0, 0];
  private isRunning: boolean = false;
  private anchorTime = 0;
  private anchorFrac = 0;

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

  /** Starts the loop at its beginning at `time` (now when omitted). */
  start(time?: number): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.anchorTime = time ?? this.ctx.currentTime;
    this.anchorFrac = 0;
    this.rebuild(this.anchorTime);
  }

  stop(): void {
    if (!this.isRunning) return;
    this.isRunning = false;
    if (this.source) {
      this.endSource(this.source, this.ctx.currentTime, 0);
      this.source = null;
    }
  }

  /**
   * Puts the loop where song position `beat` (quarter notes from the song's
   * start) falls, from context time `when`: bar 1 of the LFO lines up with
   * every fourth bar of the song.
   */
  alignToBeat(when: number, beat: number): void {
    const frac = (((beat / LOOP_BEATS) % 1) + 1) % 1;
    this.anchorTime = when;
    this.anchorFrac = frac;
    if (this.isRunning) this.rebuild(when);
  }

  /** The loop position (0..1) at context time `t`. */
  phaseAt(t: number): number {
    const elapsed = (t - this.anchorTime) / this.loopSeconds();
    return (((this.anchorFrac + elapsed) % 1) + 1) % 1;
  }

  private loopSeconds(): number {
    return (LOOP_BEATS * 60) / this.bpm;
  }

  // The setters below rebuild the whole 4-bar buffer, and a patch push calls
  // them 9 times per LFO; the editor's panel then pushes the same patch again
  // on mount. A value that hasn't changed builds nothing.

  setBPM(bpm: number): void {
    const next = Math.max(1, bpm);
    if (next === this.bpm) return;
    // Keep the phase where it is now; the new tempo runs from here.
    const now = this.ctx.currentTime;
    this.anchorFrac = this.phaseAt(now);
    this.anchorTime = now;
    this.bpm = next;
    if (this.isRunning) this.rebuild(now);
  }

  setBars(bars: [LFONode[], LFONode[], LFONode[], LFONode[]]): void {
    this.bars = bars;
    if (this.isRunning) this.rebuild(this.ctx.currentTime);
  }

  setBarNodes(barIndex: number, nodes: LFONode[]): void {
    if (sameNodes(this.bars[barIndex], nodes)) return;
    // A copy, so a caller that edits its array in place still rebuilds.
    this.bars[barIndex] = nodes.map((n) => ({ ...n }));
    if (this.isRunning) this.rebuild(this.ctx.currentTime);
  }

  setBarSmooth(barIndex: number, smooth: number): void {
    if (this.smooths[barIndex] === smooth) return;
    this.smooths[barIndex] = smooth;
    if (this.isRunning) this.rebuild(this.ctx.currentTime);
  }

  getOutputNode(): GainNode {
    return this.output;
  }

  /**
   * Builds the buffer and starts it at `when`, at the loop position the
   * anchor gives for that time. A source already running crossfades out.
   */
  private rebuild(when: number): void {
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

    const node = this.ctx.createBufferSource();
    node.buffer = buffer;
    node.loop = true;
    node.playbackRate.value = 1; // Real-time; durations baked into buffer
    const gain = this.ctx.createGain();
    node.connect(gain);
    gain.connect(this.output);

    const old = this.source;
    // A source replaced in the same instant (a patch push rebuilds several
    // times in a row) was never heard: it stops without a fade, and the new
    // one takes over its fade-in, if it had one.
    let fadesIn = false;
    if (old) {
      const sameInstant = old.startedAt >= when;
      fadesIn = sameInstant ? old.fadesIn : true;
      this.endSource(old, when, sameInstant ? 0 : REBUILD_FADE);
    }
    if (fadesIn) {
      gain.gain.value = 0;
      gain.gain.setValueAtTime(0, when);
      gain.gain.linearRampToValueAtTime(1, when + REBUILD_FADE);
    } else {
      gain.gain.value = 1;
    }
    node.start(when, this.phaseAt(when) * this.loopSeconds());
    this.source = { node, gain, startedAt: when, fadesIn };
  }

  /** Fades a source out over `fade` from `when`, stops it, then unwires it. */
  private endSource(source: LfoSource, when: number, fade: number): void {
    if (fade > 0) {
      source.gain.gain.setValueAtTime(1, when);
      source.gain.gain.linearRampToValueAtTime(0, when + fade);
    }
    source.node.onended = () => {
      source.node.disconnect();
      source.gain.disconnect();
    };
    try {
      source.node.stop(when + fade);
    } catch {
      // Already stopped
      source.node.disconnect();
      source.gain.disconnect();
    }
  }
}
