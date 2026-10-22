// ── Where an audio take lands (milestone 1.11 d) ────────────────────────────
// The recorder's capture tap (public/daw-assets/capture-processor.js) tells us
// the context time of the first frame it captured. That frame was played by
// the student a moment earlier, against music that had left the context
// earlier still:
//
//   - inputLatency: the time from the microphone to the audio graph: the
//     track's own figure (MediaStreamTrack settings' `latency`) where the
//     browser gives one, else 0. A guitar or vocal adapter's stream is made
//     inside the context (a MediaStreamDestination) and reports none, and
//     the adapters don't expose their device's figure, so their takes count
//     only the output side (the caller may pass a figure it knows).
//   - baseLatency + outputLatency: the time from the audio graph to the
//     speakers: the context's own buffering plus the device's (0 where the
//     browser doesn't say). heardTime's fallback uses the same sum, so an
//     audio take and a MIDI take agree.
//
// So the student was hearing context time
//
//     heard = captureStart − inputLatency − baseLatency − outputLatency
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
  baseLatency: number;
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
    timing.captureStart -
    timing.inputLatency -
    timing.baseLatency -
    timing.outputLatency;
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
  /** The lags looked for, in seconds (see findLagSeconds). The tap starts
   *  first, and MediaRecorder's own start-up makes the decoded audio start
   *  later: about −150 ms to +20 ms. */
  minLagSeconds?: number;
  maxLagSeconds?: number;
  /** Among scores this close to the best, the lag nearest this one wins. */
  preferLagSeconds?: number;
  tieTolerance?: number;
  /** Below this normalised correlation (silence, noise) there's no lag. */
  minCorrelation?: number;
}

/** Averages `factor` samples at a time (a crude low-pass, then decimation). */
function downsample(
  signal: Float32Array,
  from: number,
  length: number,
  factor: number,
): Float32Array {
  const out = new Float32Array(Math.floor(length / factor));
  for (let i = 0; i < out.length; i++) {
    let sum = 0;
    const at = from + i * factor;
    for (let j = 0; j < factor; j++) sum += signal[at + j];
    out[i] = sum / factor;
  }
  return out;
}

/** The normalised correlation of reference[0..n) with target[at..at+n). */
function correlationAt(
  reference: Float32Array,
  n: number,
  target: Float32Array,
  at: number,
): number {
  let dot = 0;
  let refEnergy = 0;
  let tgtEnergy = 0;
  for (let i = 0; i < n; i++) {
    const r = reference[i];
    const t = target[at + i];
    dot += r * t;
    refEnergy += r * r;
    tgtEnergy += t * t;
  }
  const norm = Math.sqrt(refEnergy * tgtEnergy);
  return norm > 1e-9 ? dot / norm : 0;
}

/** The best-scoring lag; among near-ties, the one nearest `prefer`. */
function pickLag(
  scores: ReadonlyArray<readonly [lag: number, score: number]>,
  prefer: number,
  tolerance: number,
): { lag: number; score: number } {
  let best = -Infinity;
  for (const [, score] of scores) best = Math.max(best, score);
  let pick = { lag: prefer, score: best };
  let distance = Infinity;
  for (const [lag, score] of scores) {
    if (score < best - tolerance) continue;
    const d = Math.abs(lag - prefer);
    if (d < distance) {
      distance = d;
      pick = { lag, score };
    }
  }
  return pick;
}

/**
 * How many seconds earlier `target` (the decoded audio) starts than
 * `reference` (the tap's PCM): target[i + lag·rate] ≈ reference[i]. Negative
 * when it starts later. 0 when the two don't correlate (a silent start).
 *
 * Every lag is scored over the same slice of the tap (one that every lag in
 * the range can see whole), so a lag at the range's edge can't win on a
 * short overlap, and periodic input (a click track) can't tie a beat away.
 * The range is the plausible one only, near-ties go to the lag nearest
 * `preferLagSeconds`, and a coarse search at about 4 kHz finds the peak
 * before a search at the full rate around it finds the sample.
 */
export function findLagSeconds(
  reference: Float32Array,
  target: Float32Array,
  sampleRate: number,
  options: LagOptions = {},
): number {
  const windowSeconds = options.windowSeconds ?? 2;
  const minLagSeconds = options.minLagSeconds ?? -0.15;
  const maxLagSeconds = Math.max(minLagSeconds, options.maxLagSeconds ?? 0.02);
  const prefer = Math.min(
    maxLagSeconds,
    Math.max(minLagSeconds, options.preferLagSeconds ?? 0),
  );
  const tolerance = options.tieTolerance ?? 0.02;
  const minCorrelation = options.minCorrelation ?? 0.3;

  const factor = Math.max(1, Math.floor(sampleRate / 4000));
  const minLag = Math.round(minLagSeconds * sampleRate);
  const maxLag = Math.round(maxLagSeconds * sampleRate);
  // The slice of the tap: it starts late enough that the earliest lag
  // reads from target[0], on the coarse grid.
  const from = Math.ceil(Math.max(0, -minLag) / factor) * factor;
  const n =
    Math.floor(
      Math.min(
        Math.round(windowSeconds * sampleRate),
        reference.length - from,
        target.length - from - maxLag - 2 * factor,
      ) / factor,
    ) * factor;
  if (n < 64 * factor) return 0;

  const slice = reference.subarray(from, from + n);
  let refEnergy = 0;
  for (let i = 0; i < n; i++) refEnergy += slice[i] * slice[i];
  if (refEnergy / n < 1e-8) return 0;

  const refDs = downsample(slice, 0, n, factor);
  const tgtDs = downsample(target, 0, target.length, factor);
  const coarse: Array<[number, number]> = [];
  for (
    let lagDs = Math.ceil(minLag / factor);
    lagDs <= Math.floor(maxLag / factor);
    lagDs++
  ) {
    coarse.push([
      lagDs * factor,
      correlationAt(refDs, refDs.length, tgtDs, from / factor + lagDs),
    ]);
  }
  const preferSamples = Math.round(prefer * sampleRate);
  const peak = pickLag(coarse, preferSamples, tolerance);
  if (peak.score < minCorrelation) return 0;

  const fine: Array<[number, number]> = [];
  const lo = Math.max(minLag, peak.lag - 2 * factor);
  const hi = Math.min(maxLag, peak.lag + 2 * factor);
  for (let lag = lo; lag <= hi; lag++) {
    if (from + lag < 0) continue;
    fine.push([lag, correlationAt(slice, n, target, from + lag)]);
  }
  return pickLag(fine, preferSamples, 1e-6).lag / sampleRate;
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
