import { buildPeakLevels, type PeakLevel } from './peakLevels';

// ── Waveform peaks ──────────────────────────────────────────────────────────
// Waveforms used to rescan every sample of every visible audio clip on each
// timeline redraw (findings timeline-07, audio-core-09). Now each decoded
// AudioBuffer gets a min/max pyramid (peakLevels.ts), built the first time the
// buffer is drawn, and a redraw reads only the points on screen, each exactly
// over its own samples, and each once per zoom (readPeaks).
//
// Pyramids live in a WeakMap keyed by the buffer itself. A replaced,
// re-recorded or pitch-shifted buffer is a different object, so it gets its
// own pyramid, and a pyramid goes away with its buffer: nothing here evicts or
// clears anything in AudioBufferStore.
//
// A buffer longer than WORKER_MIN_SECONDS is summarised in a worker, so a
// long take never blocks a frame. Long takes queue for it and go one at a
// time, a channel at a time, each from a copy made only when it is sent: a
// project that opens with six long stems holds one channel's copy, not six
// takes' worth. Until a take's pyramid arrives it reads as null and the
// timeline draws a flat line for it. Without workers (tests, or a browser
// that refuses one), and once the worker fails or stops answering, buffers
// are summarised on the page.

/** Buffers longer than this are summarised in the peaks worker. */
export const WORKER_MIN_SECONDS = 30;

/** Channels summarised per buffer: a stereo pair, or one mono channel. */
const MAX_CHANNELS = 2;

/** Every level of one buffer's peaks. */
export interface PeakPyramid {
  /** Samples in the buffer the pyramid describes. */
  length: number;
  /** Finest first, at PEAK_BUCKET_SIZES. */
  levels: PeakLevel[];
}

/**
 * Sent to the peaks worker: copies of a buffer's channels. The page sends one
 * channel at a time; the worker summarises however many it is given.
 */
export interface PeaksRequest {
  id: number;
  length: number;
  channels: Float32Array[];
}

/** The worker's answer: the pyramid's levels, or why it could not build them. */
export type PeaksResponse =
  | { id: number; levels: PeakLevel[] }
  | { id: number; error: string };

/** The part of an AudioBuffer the peaks read. */
type SampleSource = Pick<
  AudioBuffer,
  'length' | 'numberOfChannels' | 'duration' | 'getChannelData'
>;

const pyramids = new WeakMap<SampleSource, PeakPyramid>();
const pending = new WeakSet<SampleSource>();
const subscribers = new Set<() => void>();

function notify(): void {
  for (const cb of subscribers) cb();
}

/**
 * Calls `cb` whenever a pyramid built off the page arrives (or its build
 * falls back to the page), so a canvas waiting for one can redraw.
 */
export function subscribePeakPyramids(cb: () => void): () => void {
  subscribers.add(cb);
  return () => {
    subscribers.delete(cb);
  };
}

function channelsOf(buffer: SampleSource): number {
  return Math.min(MAX_CHANNELS, buffer.numberOfChannels);
}

/** Builds a buffer's pyramid on the page. */
function summarise(buffer: SampleSource): PeakPyramid {
  const channels = Array.from({ length: channelsOf(buffer) }, (_, c) =>
    buffer.getChannelData(c),
  );
  return {
    length: buffer.length,
    levels: buildPeakLevels(channels, buffer.length),
  };
}

// ── The worker ──────────────────────────────────────────────────────────────

/**
 * How long the worker may take over one channel. It takes about 50 ms for a
 * 40 s stereo take, so a worker this late is stuck: it is given up, and the
 * page summarises what it held and everything after.
 */
export const WORKER_TIMEOUT_MS = 10_000;

let worker: Worker | null = null;
/** Set once a worker could not be made or failed: the page builds from then on. */
let workerUnavailable = false;
let nextJob = 1;

/** Long takes waiting for the worker, oldest first. */
const queue: SampleSource[] = [];

/** The one channel the worker is summarising. */
interface Job {
  id: number;
  buffer: SampleSource;
  channel: number;
  /** The levels of the buffer's earlier channels. */
  levels: PeakLevel[] | null;
  timer: ReturnType<typeof setTimeout>;
}
let job: Job | null = null;

function openWorker(): Worker | null {
  if (worker) return worker;
  if (workerUnavailable || typeof Worker === 'undefined') return null;
  try {
    worker = new Worker(new URL('../workers/peaksWorker.ts', import.meta.url), {
      type: 'module',
    });
  } catch {
    workerUnavailable = true;
    return null;
  }
  worker.onmessage = (event: MessageEvent<PeaksResponse>) => settle(event.data);
  worker.onerror = (event) => {
    event.preventDefault();
    abandonWorker();
  };
  worker.onmessageerror = () => abandonWorker();
  return worker;
}

/** Queues a long take for the worker; false when there is no worker. */
function queueForWorker(buffer: SampleSource): boolean {
  if (!openWorker()) return false;
  pending.add(buffer);
  queue.push(buffer);
  if (!job) sendNext();
  // Sending can fail, which gives the worker up and empties the queue.
  return pending.has(buffer);
}

/** Starts the oldest queued take, when the worker is free. */
function sendNext(): void {
  const buffer = queue.shift();
  if (buffer) sendChannel(buffer, 0, null);
}

function sendChannel(
  buffer: SampleSource,
  channel: number,
  levels: PeakLevel[] | null,
): void {
  if (!worker) {
    pending.delete(buffer);
    return;
  }
  // A copy, made now: an AudioBuffer's own data cannot be transferred, and
  // the copy can, so the page lets go of it as it is sent.
  const data = buffer.getChannelData(channel).slice();
  const id = nextJob++;
  const request: PeaksRequest = { id, length: buffer.length, channels: [data] };
  try {
    worker.postMessage(request, [data.buffer as ArrayBuffer]);
  } catch {
    // Not sent, so not the worker's job: let it go with the queue, and the
    // page summarises it.
    pending.delete(buffer);
    abandonWorker();
    return;
  }
  job = {
    id,
    buffer,
    channel,
    levels,
    timer: setTimeout(abandonWorker, WORKER_TIMEOUT_MS),
  };
}

function settle(response: PeaksResponse): void {
  if (!job || response.id !== job.id) return;
  const { buffer, channel, levels } = job;
  clearTimeout(job.timer);
  job = null;
  if ('error' in response) {
    // The worker could not read this one; the page builds it instead of
    // asking again.
    finish(buffer, summarise(buffer));
  } else {
    const merged = levels
      ? levels.map((level, l) => ({
          bucketSize: level.bucketSize,
          min: [...level.min, ...response.levels[l].min],
          max: [...level.max, ...response.levels[l].max],
        }))
      : response.levels;
    if (channel + 1 < channelsOf(buffer)) {
      sendChannel(buffer, channel + 1, merged);
      return;
    }
    finish(buffer, { length: buffer.length, levels: merged });
  }
  sendNext();
}

function finish(buffer: SampleSource, pyramid: PeakPyramid): void {
  pending.delete(buffer);
  pyramids.set(buffer, pyramid);
  notify();
}

/**
 * The worker failed as a whole, or stopped answering: it is stopped, the
 * take it held and the queued ones are let go, and they, and every later
 * one, are summarised on the page the next time they are drawn.
 */
function abandonWorker(): void {
  worker?.terminate();
  worker = null;
  workerUnavailable = true;
  if (job) {
    clearTimeout(job.timer);
    pending.delete(job.buffer);
    job = null;
  }
  for (const buffer of queue) pending.delete(buffer);
  queue.length = 0;
  notify();
}

// ── Reading ─────────────────────────────────────────────────────────────────

/**
 * The buffer's pyramid, building it on first use: on the page, or for a
 * buffer longer than WORKER_MIN_SECONDS in the worker, in which case this is
 * null until it arrives (subscribePeakPyramids says when).
 */
export function getPeakPyramid(buffer: SampleSource): PeakPyramid | null {
  const built = pyramids.get(buffer);
  if (built) return built;
  if (pending.has(buffer)) return null;
  if (buffer.duration > WORKER_MIN_SECONDS && queueForWorker(buffer)) {
    return null;
  }
  const pyramid = summarise(buffer);
  pyramids.set(buffer, pyramid);
  return pyramid;
}

/** Largest |sample| across channels in buckets [from, to) of one level. */
function bucketsMaxAbs(level: PeakLevel, from: number, to: number): number {
  let peak = 0;
  for (let c = 0; c < level.max.length; c++) {
    const lows = level.min[c];
    const highs = level.max[c];
    const end = Math.min(to, highs.length);
    for (let b = Math.max(0, from); b < end; b++) {
      if (highs[b] > peak) peak = highs[b];
      if (-lows[b] > peak) peak = -lows[b];
    }
  }
  return peak;
}

/** Largest |sample| across channels in samples [from, to). */
function samplesMaxAbs(
  channels: readonly Float32Array[],
  from: number,
  to: number,
): number {
  // Indexed loops and Math.abs: about four times faster than for…of with a
  // hand-written abs, which matters at full zoom, where this runs per point.
  let peak = 0;
  for (let c = 0; c < channels.length; c++) {
    const data = channels[c];
    for (let i = from; i < to; i++) {
      const v = Math.abs(data[i]);
      if (v > peak) peak = v;
    }
  }
  return peak;
}

/**
 * Largest |sample| across channels in samples [from, to), exactly: never a
 * sample outside the range. The middle comes from the coarsest level (at or
 * below `top`) with whole buckets inside the range, each ragged end from the
 * finer levels, and the last few samples at each end (under one fine bucket)
 * from the samples themselves. However wide the range, that is a handful of
 * buckets a level plus at most 255 samples at each end.
 */
function rangeMaxAbs(
  levels: readonly PeakLevel[],
  samples: () => readonly Float32Array[],
  from: number,
  to: number,
  top = levels.length - 1,
): number {
  if (from >= to) return 0;
  for (let l = top; l >= 0; l--) {
    const size = levels[l].bucketSize;
    const inner = Math.ceil(from / size);
    const outer = Math.floor(to / size);
    if (inner < outer) {
      return Math.max(
        rangeMaxAbs(levels, samples, from, inner * size, l - 1),
        bucketsMaxAbs(levels[l], inner, outer),
        rangeMaxAbs(levels, samples, outer * size, to, l - 1),
      );
    }
  }
  return samplesMaxAbs(samples(), from, to);
}

// ── Points already read ─────────────────────────────────────────────────────
// Reading a point exactly costs up to a few hundred samples at its ends, and
// the timeline asks for the same points over and over: as it scrolls, while
// it plays or records, on any edit. So each pyramid keeps the points it has
// read for its last few waveforms (a waveform is a window split into a number
// of points); a redraw at the same zoom reads only the points it has not
// shown before, and a zoom step reads its points once.

/** One waveform's points read so far, and its scale. */
interface PointsRead {
  numPoints: number;
  start: number;
  end: number;
  /** Each point's peak, or -1 for one not read yet. */
  peaks: Float32Array;
  scale: number;
}

/** Waveforms remembered per pyramid: a few zoom steps, or a few trims. */
const WAVEFORMS_KEPT = 4;
/** A waveform with more points than this is read afresh each time. */
const MAX_POINTS_KEPT = 1 << 16;

const pointsRead = new WeakMap<PeakPyramid, PointsRead[]>();

function pointsFor(
  pyramid: PeakPyramid,
  numPoints: number,
  start: number,
  end: number,
  samples: () => readonly Float32Array[],
): PointsRead {
  const kept = pointsRead.get(pyramid) ?? [];
  const at = kept.findIndex(
    (w) => w.numPoints === numPoints && w.start === start && w.end === end,
  );
  if (at >= 0) {
    const [hit] = kept.splice(at, 1);
    kept.unshift(hit);
    return hit;
  }
  const fresh: PointsRead = {
    numPoints,
    start,
    end,
    peaks: new Float32Array(numPoints).fill(-1),
    scale: rangeMaxAbs(pyramid.levels, samples, start, end),
  };
  if (numPoints <= MAX_POINTS_KEPT) {
    kept.unshift(fresh);
    kept.length = Math.min(kept.length, WAVEFORMS_KEPT);
    pointsRead.set(pyramid, kept);
  }
  return fresh;
}

/**
 * Normalised 0–1 peaks for points `firstPoint`…`lastPoint` of a waveform that
 * splits samples [windowStart, windowEnd) into `numPoints` equal parts, across
 * both channels. Only the asked-for points are read, each exactly over its
 * own samples (rangeMaxAbs), so a hit lights the point it falls in and no
 * neighbour, at any zoom; a point read before for the same waveform is not
 * read again. The scale is the loudest sample of the whole window, which is
 * the loudest point, so the waveform keeps its height as it scrolls. An
 * empty window reads as silence.
 */
export function readPeaks(
  pyramid: PeakPyramid,
  source: Pick<AudioBuffer, 'getChannelData'>,
  numPoints: number,
  windowStart: number,
  windowEnd: number,
  firstPoint = 0,
  lastPoint = numPoints - 1,
): number[] {
  const first = Math.max(0, firstPoint);
  const last = Math.min(numPoints - 1, lastPoint);
  if (last < first) return [];
  const out = new Array<number>(last - first + 1).fill(0);

  const { length, levels } = pyramid;
  const start = Math.min(Math.max(0, Math.floor(windowStart)), length);
  const end = Math.min(Math.max(start, Math.floor(windowEnd)), length);
  if (end <= start || levels.length === 0) return out;

  // The samples are fetched once, and only if some range has ragged ends.
  const channelCount = levels[0].min.length;
  let channels: Float32Array[] | null = null;
  const samples = () =>
    (channels ??= Array.from({ length: channelCount }, (_, c) =>
      source.getChannelData(c),
    ));

  const waveform = pointsFor(pyramid, numPoints, start, end, samples);
  const { peaks, scale } = waveform;
  const perPoint = (end - start) / numPoints;
  for (let i = first; i <= last; i++) {
    if (peaks[i] < 0) {
      const from = Math.min(start + Math.floor(i * perPoint), end - 1);
      const to =
        i === numPoints - 1
          ? end
          : Math.max(from + 1, start + Math.floor((i + 1) * perPoint));
      peaks[i] = rangeMaxAbs(levels, samples, from, Math.min(to, end));
    }
    out[i - first] = scale > 0 ? peaks[i] / scale : 0;
  }
  return out;
}
