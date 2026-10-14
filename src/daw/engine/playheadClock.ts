import {
  useEffect,
  useLayoutEffect,
  useRef,
  useSyncExternalStore,
} from 'react';
import * as Tone from 'tone';
import { useStore } from '@/daw/store';
import { setLivePlayheadReader } from '@/daw/store/transportSlice';
import { addFrameTask } from './engineClock';

// ── playheadClock ───────────────────────────────────────────────────────
// Where the playhead is, kept out of the store (milestone 1.7). The store's
// `position` is the parked playhead: it is written on pause, stop and seek
// only, so playback no longer writes the store 30 times a second and wakes
// every store listener (autosave, undo, collab, save chip) with it.
//
// While the transport runs, the playhead is read from Tone's clock at the
// moment the student is hearing: the audio clock now, less the output
// latency. Tone's own `ticks` reads ahead of that by its lookAhead (about
// 100 ms) plus the device latency, so a playhead drawn from it ran ahead of
// the music.
//
// Readers:
// - getPlayheadTick(): one read, live, for actions (paste or split at the
//   playhead, record start, marker skip).
// - usePlayheadEffect(cb): a component paints its playhead through a ref
//   on every frame, without rendering.
// - usePlayheadSelector(fn): a component renders only when fn's value
//   changes (the current bar, chord or system), not on every frame.
// Subscribers get one call per frame, from the shared engineClock loop,
// and the loop runs only while the transport plays and someone listens.

/** Where the clock reads the transport. Tone in the app; a fake in tests. */
export interface PlayheadSource {
  /** The audio clock now, in seconds (no lookAhead). */
  currentTime(): number;
  /** The output latency to subtract, in seconds. */
  outputLatency(): number;
  /** The transport's tick at audio time `time`. */
  ticksAtTime(time: number): number;
  /** The time Tone schedules "now" at (currentTime + lookAhead). */
  scheduleTime(): number;
}

const toneSource: PlayheadSource = {
  currentTime: () => Tone.getContext().rawContext.currentTime,
  outputLatency: () => {
    const raw = Tone.getContext().rawContext as unknown as {
      outputLatency?: number;
      baseLatency?: number;
    };
    return raw.outputLatency || raw.baseLatency || 0;
  },
  ticksAtTime: (time) => Tone.getTransport().getTicksAtTime(time),
  scheduleTime: () => Tone.now(),
};

let source: PlayheadSource = toneSource;

/**
 * The current run: the audio time the transport started (or was last
 * seeked) at, and the tick it started from. Before that time reaches the
 * speakers the playhead holds at the start tick: Tone answers a time before
 * the start with the tick the transport had before it, which after a seek
 * is the old place.
 */
let run: { startTime: number; startTick: number } | null = null;

const listeners = new Set<(tick: number) => void>();
let stopTask: (() => void) | null = null;
let unsubscribeStore: (() => void) | null = null;
let frameTick = 0;

function parkedTick(): number {
  return useStore.getState().position;
}

function liveTick(): number {
  if (!run) return parkedTick();
  const heard = source.currentTime() - source.outputLatency();
  if (heard < run.startTime) return run.startTick;
  return Math.max(0, source.ticksAtTime(heard));
}

/** The playhead's tick now (fractional while playing). */
export function getPlayheadTick(): number {
  return run ? liveTick() : parkedTick();
}

/** True between the transport's start and its pause or stop. */
export function isPlayheadRunning(): boolean {
  return run !== null;
}

/** The tick subscribers saw last; live when nothing is listening. */
function displayTick(): number {
  return stopTask ? frameTick : getPlayheadTick();
}

function publish(tick: number): void {
  if (tick === frameTick) return;
  frameTick = tick;
  for (const listener of Array.from(listeners)) listener(tick);
}

function syncLoop(): void {
  const wanted = run !== null && listeners.size > 0;
  if (wanted && !stopTask) {
    frameTick = liveTick();
    stopTask = addFrameTask(() => publish(liveTick()), { name: 'playhead' });
  } else if (!wanted && stopTask) {
    stopTask();
    stopTask = null;
  }
}

/**
 * Calls `listener` with the playhead's tick once per frame while playing,
 * and on every pause, stop and seek. Returns the unsubscribe function.
 */
export function subscribePlayhead(
  listener: (tick: number) => void,
): () => void {
  listeners.add(listener);
  if (!unsubscribeStore) {
    frameTick = getPlayheadTick();
    // The parked playhead moves with the store (seek, stop, a load).
    unsubscribeStore = useStore.subscribe(
      (s) => s.position,
      (position) => {
        if (!run) publish(position);
      },
    );
  }
  syncLoop();
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && unsubscribeStore) {
      unsubscribeStore();
      unsubscribeStore = null;
    }
    syncLoop();
  };
}

// ── Driven by useTransport and seekTo ────────────────────────────────────

/** The transport starts at audio time `time` from `tick`. */
export function startPlayheadRun(tick: number, time: number): void {
  run = { startTime: time, startTick: tick };
  syncLoop();
}

/**
 * The transport has paused or stopped: the clock parks and readers fall
 * back to the store's position, which the pause or stop action wrote.
 */
export function endPlayheadRun(): void {
  run = null;
  syncLoop();
  if (listeners.size > 0) publish(parkedTick());
}

/** A seek while playing: hold at `tick` until the jump is heard. */
export function notePlayheadSeek(tick: number): void {
  if (run) run = { startTime: source.scheduleTime(), startTick: tick };
}

// The store's pause action parks the playhead where the student heard it.
// A pause must always go through, so a clock that can't be read (a closed
// context) parks it where the run started.
setLivePlayheadReader(() => {
  if (!run) return null;
  try {
    return liveTick();
  } catch {
    return run.startTick;
  }
});

// ── React readers ───────────────────────────────────────────────────────

/**
 * Calls `paint(tick)` after every render and on every playhead change, for
 * a playhead drawn through a ref: the component itself never re-renders for
 * the playhead. `paint` may change between renders (new geometry); the
 * latest one is used.
 */
export function usePlayheadEffect(paint: (tick: number) => void): void {
  const paintRef = useRef(paint);
  paintRef.current = paint;
  // Repaint with the new geometry after each render.
  useLayoutEffect(() => {
    paintRef.current(displayTick());
  });
  useEffect(() => subscribePlayhead((tick) => paintRef.current(tick)), []);
}

/**
 * The value of `select(tick)`, re-rendering only when it changes (by
 * `isEqual`, Object.is by default): the current bar, chord or system.
 */
export function usePlayheadSelector<T>(
  select: (tick: number) => T,
  isEqual: (a: T, b: T) => boolean = Object.is,
): T {
  const selectRef = useRef(select);
  selectRef.current = select;
  const isEqualRef = useRef(isEqual);
  isEqualRef.current = isEqual;
  const cache = useRef<{ value: T } | null>(null);

  const subscribeRef = useRef((onChange: () => void) =>
    subscribePlayhead((tick) => {
      const next = selectRef.current(tick);
      if (cache.current && isEqualRef.current(cache.current.value, next)) {
        return;
      }
      onChange();
    }),
  );

  const getSnapshot = () => {
    const next = selectRef.current(displayTick());
    if (cache.current && isEqualRef.current(cache.current.value, next)) {
      return cache.current.value;
    }
    cache.current = { value: next };
    return next;
  };

  return useSyncExternalStore(subscribeRef.current, getSnapshot);
}

// ── Tests ───────────────────────────────────────────────────────────────

/** Swaps the transport reader (tests). Pass nothing to restore Tone. */
export function setPlayheadSourceForTests(next?: PlayheadSource): void {
  source = next ?? toneSource;
  run = null;
  syncLoop();
}
