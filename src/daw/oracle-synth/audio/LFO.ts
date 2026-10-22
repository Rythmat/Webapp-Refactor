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

/** Phase difference (fraction of the loop) treated as already aligned. */
const PHASE_EPSILON = 1e-4;

interface LfoSource {
  node: AudioBufferSourceNode;
  gain: GainNode;
  startedAt: number;
  /** When it stops (Infinity while it is the running source). */
  stopAt: number;
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
  /** Every source not yet ended; the last one is the running one. */
  private sources: LfoSource[] = [];
  /** The built 4-bar buffer, reused when only the phase changes. */
  private buffer: AudioBuffer | null = null;
  private output: GainNode;

  private bpm: number = 120;
  private bars: [LFONode[], LFONode[], LFONode[], LFONode[]];
  private smooths: [number, number, number, number] = [0, 0, 0, 0];
  private isRunning: boolean = false;
  private anchorTime = 0;
  private anchorFrac = 0;
  /**
   * One-shot (a Serum envelope-mode LFO): no loop; each note-on plays bar 1
   * once from its start (trigger), then the LFO holds bar 1's last value.
   * The hold is a constant source summed into the output.
   */
  private once = false;
  private hold: ConstantSourceNode | null = null;

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
    this.buffer = null;
    this.restart(this.anchorTime);
  }

  stop(): void {
    if (!this.isRunning) return;
    this.isRunning = false;
    const now = this.ctx.currentTime;
    for (const source of this.sources) this.endSource(source, now, 0);
    this.dropHold();
  }

  /** Loops (false, the default) or plays once per note-on (true). */
  setOnce(on: boolean): void {
    if (on === this.once) return;
    this.once = on;
    const now = this.ctx.currentTime;
    for (const source of this.sources) {
      this.endSource(source, now, source.startedAt < now ? REBUILD_FADE : 0);
    }
    if (on) {
      this.idleHold(now);
    } else {
      this.dropHold();
      if (this.isRunning) this.restart(now);
    }
  }

  /**
   * A note-on at `time`: a one-shot LFO plays bar 1 from its start, then
   * holds its last value. A looping LFO ignores it (it keeps the bars).
   */
  trigger(time: number): void {
    if (!this.once || !this.isRunning) return;
    const buffer = this.getBuffer();
    const bar = this.loopSeconds() / 4;
    for (const old of this.sources) {
      if (old.stopAt <= time) continue;
      this.endSource(old, time, old.startedAt < time ? REBUILD_FADE : 0);
    }
    const node = this.ctx.createBufferSource();
    node.buffer = buffer;
    const gain = this.ctx.createGain();
    node.connect(gain);
    gain.connect(this.output);
    node.start(time, 0, bar);
    const source: LfoSource = {
      node,
      gain,
      startedAt: time,
      stopAt: time + bar,
    };
    node.onended = () => {
      node.disconnect();
      gain.disconnect();
      this.sources = this.sources.filter((s) => s !== source);
    };
    this.sources.push(source);
    const hold = this.ensureHold();
    const last =
      buffer.getChannelData(0)[
        Math.min(buffer.length - 1, Math.round(bar * buffer.sampleRate) - 1)
      ];
    hold.offset.cancelScheduledValues(time);
    hold.offset.setValueAtTime(0, time);
    hold.offset.setValueAtTime(last, time + bar);
  }

  /** Before any note: a one-shot LFO rests at bar 1's first value. */
  private idleHold(when: number): void {
    const first = this.getBuffer().getChannelData(0)[0] ?? 0;
    const hold = this.ensureHold();
    hold.offset.cancelScheduledValues(when);
    hold.offset.setValueAtTime(first, when);
  }

  private ensureHold(): ConstantSourceNode {
    if (!this.hold) {
      this.hold = this.ctx.createConstantSource();
      this.hold.offset.value = 0;
      this.hold.connect(this.output);
      this.hold.start();
    }
    return this.hold;
  }

  private dropHold(): void {
    if (!this.hold) return;
    try {
      this.hold.stop();
    } catch {
      // never started
    }
    this.hold.disconnect();
    this.hold = null;
  }

  /**
   * Puts the loop where song position `beat` (quarter notes from the song's
   * start) falls, from context time `when`: bar 1 of the LFO lines up with
   * every fourth bar of the song.
   */
  alignToBeat(when: number, beat: number): void {
    const frac = (((beat / LOOP_BEATS) % 1) + 1) % 1;
    // Already there (a loop lap of a whole number of 4-bar loops, or a
    // play from where the loop already is): nothing to restart.
    const diff = Math.abs(this.phaseAt(when) - frac);
    const aligned = Math.min(diff, 1 - diff) < PHASE_EPSILON;
    this.anchorTime = when;
    this.anchorFrac = frac;
    if (this.isRunning && !aligned) this.restart(when);
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
  // on mount. A value that hasn't changed builds nothing, and the edits of
  // one push rebuild once, after it (queueRebuild).

  setBPM(bpm: number): void {
    const next = Math.max(1, bpm);
    if (next === this.bpm) return;
    // Keep the phase where it is now; the new tempo runs from here.
    const now = this.ctx.currentTime;
    this.anchorFrac = this.phaseAt(now);
    this.anchorTime = now;
    this.bpm = next;
    this.buffer = null;
    if (this.isRunning) this.restart(now);
  }

  setBars(bars: [LFONode[], LFONode[], LFONode[], LFONode[]]): void {
    this.bars = bars;
    this.queueRebuild();
  }

  setBarNodes(barIndex: number, nodes: LFONode[]): void {
    if (sameNodes(this.bars[barIndex], nodes)) return;
    // A copy, so a caller that edits its array in place still rebuilds.
    this.bars[barIndex] = nodes.map((n) => ({ ...n }));
    this.queueRebuild();
  }

  setBarSmooth(barIndex: number, smooth: number): void {
    if (this.smooths[barIndex] === smooth) return;
    this.smooths[barIndex] = smooth;
    this.queueRebuild();
  }

  private rebuildQueued = false;

  /**
   * Drops the buffer and restarts on it once the current task's edits are
   * in (a preset load sets 8 values per LFO in one go). A note-on in the
   * meantime builds it on demand.
   */
  private queueRebuild(): void {
    this.buffer = null;
    if (!this.isRunning || this.rebuildQueued) return;
    this.rebuildQueued = true;
    queueMicrotask(() => {
      this.rebuildQueued = false;
      if (this.isRunning && !this.buffer) this.restart(this.ctx.currentTime);
    });
  }

  getOutputNode(): GainNode {
    return this.output;
  }

  private getBuffer(): AudioBuffer {
    if (this.buffer) return this.buffer;
    // Each bar = one musical bar duration (4 beats at current BPM)
    const barDuration = 240 / this.bpm;
    const barDurations: [number, number, number, number] = [
      barDuration,
      barDuration,
      barDuration,
      barDuration,
    ];
    // Nodes directly define the full waveform shape (no tiling)
    this.buffer = LFOWaveformBuilder.buildBuffer(
      this.ctx,
      this.bars,
      barDurations,
      this.smooths,
    );
    return this.buffer;
  }

  /**
   * Starts a source at `when`, at the loop position the anchor gives for
   * that time (the buffer is rebuilt only after an edit). Every earlier
   * source still sounding at `when`, including one booked ahead by a play
   * that hasn't started yet, crossfades out; one that would only start
   * later is cancelled.
   */
  private restart(when: number): void {
    // A one-shot LFO has no loop: an edit only moves where it rests.
    if (this.once) {
      if (this.isRunning) this.idleHold(when);
      return;
    }
    const node = this.ctx.createBufferSource();
    node.buffer = this.getBuffer();
    node.loop = true;
    node.playbackRate.value = 1; // Real-time; durations baked into buffer
    const gain = this.ctx.createGain();
    node.connect(gain);
    gain.connect(this.output);

    // Fade in only when something audible is being replaced; a patch push
    // rebuilds several times in the same instant, and those never sound.
    let fadesIn = false;
    for (const old of this.sources) {
      if (old.stopAt <= when) continue;
      const audible = old.startedAt < when;
      if (audible) fadesIn = true;
      this.endSource(old, when, audible ? REBUILD_FADE : 0);
    }
    if (fadesIn) {
      gain.gain.value = 0;
      gain.gain.setValueAtTime(0, when);
      gain.gain.linearRampToValueAtTime(1, when + REBUILD_FADE);
    } else {
      gain.gain.value = 1;
    }
    node.start(when, this.phaseAt(when) * this.loopSeconds());
    this.sources.push({ node, gain, startedAt: when, stopAt: Infinity });
  }

  /** Fades a source out over `fade` from `when`, stops it, then unwires it. */
  private endSource(source: LfoSource, when: number, fade: number): void {
    const end = Math.max(when, source.startedAt) + fade;
    if (end >= source.stopAt) return;
    source.stopAt = end;
    const unwire = () => {
      source.node.disconnect();
      source.gain.disconnect();
      this.sources = this.sources.filter((s) => s !== source);
    };
    if (fade > 0) {
      source.gain.gain.cancelScheduledValues(when);
      source.gain.gain.setValueAtTime(1, when);
      source.gain.gain.linearRampToValueAtTime(0, end);
    }
    source.node.onended = unwire;
    try {
      source.node.stop(end);
    } catch {
      // Already stopped
      unwire();
    }
  }
}
