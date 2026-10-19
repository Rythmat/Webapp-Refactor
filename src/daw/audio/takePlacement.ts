// ── Where an audio take lands (milestone 1.11 d) ────────────────────────────
// The recorder's capture tap (public/daw-assets/capture-processor.js) tells us
// the context time of the first frame it captured. That frame was played by
// the student a moment earlier, against music that had left the context
// earlier still:
//
//   - inputLatency: the time from the microphone (or the guitar's input) to
//     the audio graph. The track's own figure (MediaStreamTrack settings'
//     `latency`) where the browser gives one, else the context's baseLatency.
//   - outputLatency: the time from the audio graph to the speakers
//     (AudioContext.outputLatency, 0 where the browser doesn't say).
//
// So the student was hearing context time
//
//     heard = captureStart − inputLatency − outputLatency
//
// when they played the first captured frame, and the take starts at the
// transport's tick for that time. A joint play+record start books the
// transport a little ahead, and a tap that started before it captured audio
// from before the song began: that part is trimmed (offsetSeconds), and the
// take starts on the start's tick.
//
// The clip plays the decoded MediaRecorder audio (the bytes cloud save
// uploads, so a reload plays the same thing), which starts a little before or
// after the tap's first frame. lagSeconds lines them up: positive when the
// decoded audio starts earlier (that much is skipped with offsetSeconds),
// negative when it starts later (the clip starts that much later).

/** What the tap's first frame tells us, read while the transport runs. */
export interface TakeAnchor {
  /** The context time the student was hearing at the first frame. */
  heard: number;
  /** When the transport started (null if unknown). */
  transportStart: number | null;
  /** A time on the transport, and its tick, read when the take began. */
  baseTime: number;
  baseTick: number;
  /** The tempo then, in ticks per second. */
  ticksPerSecond: number;
}

export interface TakePlacement {
  startTick: number;
  /** How far into the decoded audio the clip starts, in seconds. */
  offsetSeconds: number;
}

export interface CaptureTiming {
  /** The context time of the tap's first frame. */
  captureStart: number;
  inputLatency: number;
  outputLatency: number;
  transportStart: number | null;
  /** The transport's tick at a context time. */
  ticksAtTime: (time: number) => number;
  /** The tempo, in ticks per second. */
  ticksPerSecond: number;
}

/** The anchor for a take whose tap started at `timing.captureStart`. */
export function takeAnchor(timing: CaptureTiming): TakeAnchor {
  const heard =
    timing.captureStart - timing.inputLatency - timing.outputLatency;
  const start = timing.transportStart;
  const baseTime = start !== null && heard < start ? start : heard;
  return {
    heard,
    transportStart: start,
    baseTime,
    baseTick: timing.ticksAtTime(baseTime),
    ticksPerSecond: timing.ticksPerSecond,
  };
}

/** Where the decoded take lands, `lagSeconds` from the tap (see above). */
export function placeTake(
  anchor: TakeAnchor,
  lagSeconds: number,
): TakePlacement {
  let at = anchor.heard;
  let offsetSeconds = 0;
  if (lagSeconds >= 0) offsetSeconds = lagSeconds;
  else at -= lagSeconds;
  const start = anchor.transportStart;
  if (start !== null && at < start) {
    offsetSeconds += start - at;
    at = start;
  }
  const tick = anchor.baseTick + (at - anchor.baseTime) * anchor.ticksPerSecond;
  return { startTick: Math.max(0, Math.round(tick)), offsetSeconds };
}

// ── Lining the decoded audio up with the tap ────────────────────────────────

export interface LagOptions {
  /** How much of the tap to compare, in seconds. */
  windowSeconds?: number;
  /** The largest lag looked for, either way, in seconds. */
  maxLagSeconds?: number;
  /** Below this normalised correlation (silence, noise) there's no lag. */
  minCorrelation?: number;
}

/** Averages `factor` samples at a time (a crude low-pass, then decimation). */
function downsample(
  signal: Float32Array,
  length: number,
  factor: number,
): Float32Array {
  const out = new Float32Array(Math.floor(length / factor));
  for (let i = 0; i < out.length; i++) {
    let sum = 0;
    const from = i * factor;
    for (let j = 0; j < factor; j++) sum += signal[from + j];
    out[i] = sum / factor;
  }
  return out;
}

/** The normalised correlation of reference[0..n) with target shifted by
 *  `lag` (target[i + lag] against reference[i]). */
function correlationAt(
  reference: Float32Array,
  n: number,
  target: Float32Array,
  lag: number,
): number {
  const from = Math.max(0, -lag);
  const to = Math.min(n, target.length - lag);
  if (to - from < 16) return 0;
  let dot = 0;
  let refEnergy = 0;
  let tgtEnergy = 0;
  for (let i = from; i < to; i++) {
    const r = reference[i];
    const t = target[i + lag];
    dot += r * t;
    refEnergy += r * r;
    tgtEnergy += t * t;
  }
  const norm = Math.sqrt(refEnergy * tgtEnergy);
  return norm > 1e-9 ? dot / norm : 0;
}

/**
 * How many seconds earlier `target` (the decoded audio) starts than
 * `reference` (the tap's PCM): target[i + lag·rate] ≈ reference[i]. Negative
 * when it starts later. 0 when the two don't correlate (a silent start).
 * A coarse search at about 4 kHz finds the peak, then a search at the full
 * rate around it finds the sample.
 */
export function findLagSeconds(
  reference: Float32Array,
  target: Float32Array,
  sampleRate: number,
  options: LagOptions = {},
): number {
  const windowSeconds = options.windowSeconds ?? 2;
  const maxLagSeconds = options.maxLagSeconds ?? 0.5;
  const minCorrelation = options.minCorrelation ?? 0.3;
  const n = Math.min(reference.length, Math.round(windowSeconds * sampleRate));
  if (n < 64 || target.length < 64) return 0;

  let refEnergy = 0;
  for (let i = 0; i < n; i++) refEnergy += reference[i] * reference[i];
  if (refEnergy / n < 1e-8) return 0;

  const factor = Math.max(1, Math.floor(sampleRate / 4000));
  const refDs = downsample(reference, n, factor);
  const tgtDs = downsample(target, target.length, factor);
  const maxLagDs = Math.round((maxLagSeconds * sampleRate) / factor);

  let bestDs = 0;
  let bestScore = -Infinity;
  for (let lag = -maxLagDs; lag <= maxLagDs; lag++) {
    const score = correlationAt(refDs, refDs.length, tgtDs, lag);
    if (score > bestScore) {
      bestScore = score;
      bestDs = lag;
    }
  }
  if (bestScore < minCorrelation) return 0;

  const centre = bestDs * factor;
  let best = centre;
  bestScore = -Infinity;
  for (let lag = centre - 2 * factor; lag <= centre + 2 * factor; lag++) {
    const score = correlationAt(reference, n, target, lag);
    if (score > bestScore) {
      bestScore = score;
      best = lag;
    }
  }
  return best / sampleRate;
}

/** The first `frames` frames of `channels`, mixed to mono. */
export function monoHead(
  channels: readonly Float32Array[],
  frames: number,
): Float32Array {
  const length = Math.min(frames, ...channels.map((c) => c.length));
  const out = new Float32Array(Math.max(0, length));
  if (channels.length === 0) return out;
  for (const channel of channels) {
    for (let i = 0; i < out.length; i++) out[i] += channel[i];
  }
  if (channels.length > 1) {
    for (let i = 0; i < out.length; i++) out[i] /= channels.length;
  }
  return out;
}
