import { buildPeakLevels, type PeakLevel } from './peakLevels';

// ── Waveform peaks ──────────────────────────────────────────────────────────
// Waveforms used to rescan every sample of every visible audio clip on each
// timeline redraw (findings timeline-07, audio-core-09). Now each decoded
// AudioBuffer gets a min/max pyramid (peakLevels.ts), built the first time the
// buffer is drawn, and a redraw reads the level nearest the zoom for the
// points on screen only.
//
// Pyramids live in a WeakMap keyed by the buffer itself. A replaced,
// re-recorded or pitch-shifted buffer is a different object, so it gets its
// own pyramid, and a pyramid goes away with its buffer: nothing here evicts or
// clears anything in AudioBufferStore.
//
// A buffer longer than WORKER_MIN_SECONDS is summarised in a worker from a
// copy of its channels, so a long take never blocks a frame. Until the worker
// answers, its pyramid reads as null and the timeline shows "Loading…".
// Without workers (tests, or a browser that refuses one) every buffer is
// summarised on the page.

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

/** Sent to the peaks worker: copies of a buffer's channels. */
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
 * falls back to the page), so a canvas showing "Loading…" can redraw.
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

let worker: Worker | null = null;
/** Set once a worker could not be made or failed: the page builds from then on. */
let workerUnavailable = false;
let nextJob = 1;
/** Buffers whose pyramids the worker is building, by job id. */
const jobs = new Map<number, SampleSource>();

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

/** Hands a buffer to the worker; false when there is no worker to take it. */
function requestFromWorker(buffer: SampleSource): boolean {
  const port = openWorker();
  if (!port) return false;
  // The worker gets copies: an AudioBuffer's own channels cannot be
  // transferred, and the copies can, so nothing is copied a second time.
  const channels = Array.from({ length: channelsOf(buffer) }, (_, c) =>
    buffer.getChannelData(c).slice(),
  );
  const id = nextJob++;
  const request: PeaksRequest = { id, length: buffer.length, channels };
  try {
    port.postMessage(
      request,
      channels.map((c) => c.buffer as ArrayBuffer),
    );
  } catch {
    abandonWorker();
    return false;
  }
  jobs.set(id, buffer);
  pending.add(buffer);
  return true;
}

function settle(response: PeaksResponse): void {
  const buffer = jobs.get(response.id);
  if (!buffer) return;
  jobs.delete(response.id);
  pending.delete(buffer);
  pyramids.set(
    buffer,
    'levels' in response
      ? { length: buffer.length, levels: response.levels }
      : // The worker could not read this one; the page builds it instead of
        // asking again.
        summarise(buffer),
  );
  notify();
}

/**
 * The worker failed as a whole: its jobs are dropped, and their buffers, and
 * every later one, are summarised on the page the next time they are drawn.
 */
function abandonWorker(): void {
  worker?.terminate();
  worker = null;
  workerUnavailable = true;
  for (const buffer of jobs.values()) pending.delete(buffer);
  jobs.clear();
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
  if (buffer.duration > WORKER_MIN_SECONDS && requestFromWorker(buffer)) {
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

/**
 * Largest |sample| in buckets [from, to) of level `l`, reading the coarser
 * levels for the stretch they cover whole, so a long window costs a handful
 * of reads rather than one per fine bucket.
 */
function levelMaxAbs(
  levels: readonly PeakLevel[],
  l: number,
  from: number,
  to: number,
): number {
  if (from >= to) return 0;
  const coarser = levels[l + 1];
  if (!coarser) return bucketsMaxAbs(levels[l], from, to);
  const ratio = coarser.bucketSize / levels[l].bucketSize;
  const inner = Math.ceil(from / ratio);
  const outer = Math.floor(to / ratio);
  if (inner >= outer) return bucketsMaxAbs(levels[l], from, to);
  return Math.max(
    bucketsMaxAbs(levels[l], from, inner * ratio),
    levelMaxAbs(levels, l + 1, inner, outer),
    bucketsMaxAbs(levels[l], outer * ratio, to),
  );
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
 * Normalised 0–1 peaks for points `firstPoint`…`lastPoint` of a waveform that
 * splits samples [windowStart, windowEnd) into `numPoints` equal parts, across
 * both channels. Only the asked-for points are read, from the coarsest level
 * whose buckets still fit inside one point (the samples themselves when even
 * the finest is too coarse), each point reading the buckets that touch it.
 * The scale is the loudest point of the whole window, so the waveform keeps
 * its height as it scrolls. An empty window reads as silence.
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

  const perPoint = (end - start) / numPoints;
  let l = levels.length - 1;
  while (l >= 0 && levels[l].bucketSize > perPoint) l--;

  const channelCount = levels[0].min.length;
  const channels =
    l < 0
      ? Array.from({ length: channelCount }, (_, c) => source.getChannelData(c))
      : [];
  const bucket = l < 0 ? 0 : levels[l].bucketSize;
  const pointMax = (from: number, to: number) =>
    l < 0
      ? samplesMaxAbs(channels, from, to)
      : bucketsMaxAbs(
          levels[l],
          Math.floor(from / bucket),
          Math.ceil(to / bucket),
        );

  for (let i = first; i <= last; i++) {
    const from = Math.min(start + Math.floor(i * perPoint), end - 1);
    const to =
      i === numPoints - 1
        ? end
        : Math.max(from + 1, start + Math.floor((i + 1) * perPoint));
    out[i - first] = pointMax(from, Math.min(to, end));
  }

  // The loudest of every point in the window, without reading them all: the
  // points' buckets tile the window, so it is the loudest bucket touching it.
  let scale: number;
  if (l >= 0) {
    scale = levelMaxAbs(
      levels,
      l,
      Math.floor(start / bucket),
      Math.ceil(end / bucket),
    );
  } else {
    const fine = levels[0].bucketSize;
    const inner = Math.ceil(start / fine);
    const outer = Math.floor(end / fine);
    scale =
      inner >= outer
        ? samplesMaxAbs(channels, start, end)
        : Math.max(
            samplesMaxAbs(channels, start, inner * fine),
            levelMaxAbs(levels, 0, inner, outer),
            samplesMaxAbs(channels, outer * fine, end),
          );
  }
  if (scale > 0) {
    for (let i = 0; i < out.length; i++) out[i] /= scale;
  }
  return out;
}
